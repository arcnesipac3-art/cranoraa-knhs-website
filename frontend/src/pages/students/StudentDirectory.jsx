/**
 * StudentDirectory — the Students tab of /people.
 *
 * URL-driven (deep-linkable), server-queried (search/filters/sort/pagination),
 * with summary cards from real stats, group-by, column customization, bulk
 * actions, distinct loading/empty/error states and a mobile card layout.
 */
import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Skeleton, EmptyState, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalField, ModalBtnPrimary, ModalBtnSecondary, modalInputCls, modalSelectCls } from '../../components/ui';
import { useAcademicYear } from '../../context/AcademicYearContext';
import toast from 'react-hot-toast';
import {
  ENROLLMENT_STATUS_OPTIONS, enrollmentStatus, accountStatus, normalizeGrade, gradeDigit,
  studentName, studentInitials, studentLrn, formatDate,
  DIRECTORY_COLUMNS, loadColumnPrefs, saveColumnPrefs,
  SORTERS, nextOrdering, activeSorterId, GROUP_OPTIONS, buildGroups,
} from './directoryHelpers';
import { exportExcel, exportCsv, exportPdf, downloadTemplate } from './exportDirectory';

const PAGE_SIZES = [10, 25, 50, 100];
const btnBase = 'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-[0.08em] rounded-lg transition-colors';

function canWrite(user) { return user?.role === 'admin' || user?.role === 'staff'; }
function canBulk(user) { return user?.role === 'admin' || user?.staff_title === 'registrar'; }
function isAdmin(user) { return user?.role === 'admin'; }

const selectCls = `${btnBase} bg-white border border-slate-200 text-slate-600 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-200`;

function Pill({ status, account = false, onClick, title }) {
  const info = account ? accountStatus(status) : enrollmentStatus(status);
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      className={`inline-block border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] rounded ${info.cls}${onClick ? ' hover:ring-2 hover:ring-violet-300' : ''}`}
    >
      {info.label}
    </Tag>
  );
}

function Avatar({ student, size = 'w-8 h-8' }) {
  const pic = student?.profile?.profile_picture;
  if (pic) {
    return <img src={pic} alt="" className={`${size} rounded-full object-cover border border-slate-200`} loading="lazy" />;
  }
  return (
    <span className={`${size} rounded-full bg-violet-100 text-violet-700 border border-violet-200 flex items-center justify-center text-[11px] font-black shrink-0`}>
      {studentInitials(student)}
    </span>
  );
}

// ── Row actions menu (portaled so table overflow can't clip it) ─────────────
function RowMenu({ student, rect, user, onClose, actions }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!rect) return null;

  const items = [
    { id: 'profile', label: 'View Profile', onClick: () => actions.openProfile(student) },
    ...(canWrite(user) ? [
      { id: 'assign', label: 'Assign Section', onClick: () => actions.assign(student) },
      { id: 'badge', label: 'Award Badge', onClick: () => actions.badge(student) },
      { id: 'reset', label: 'Reset Password', onClick: () => actions.reset(student) },
      { id: 'chat', label: 'Message', onClick: () => actions.chat(student) },
    ] : []),
    ...(isAdmin(user) ? [{ id: 'sep', sep: true }, { id: 'delete', label: 'Delete Student', danger: true, onClick: () => actions.remove(student) }] : []),
  ];

  const top = Math.min(rect.bottom + 4, window.innerHeight - 40 - items.length * 34);
  const left = Math.min(rect.left, window.innerWidth - 200);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} aria-hidden="true" />
      <div
        role="menu"
        className="fixed z-[9999] w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 overflow-hidden"
        style={{ top, left }}
      >
        {items.map(item => item.sep
          ? <div key={item.id} className="my-1 border-t border-slate-100" />
          : (
            <button
              key={item.id}
              role="menuitem"
              onClick={() => { item.onClick(); onClose(); }}
              className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${item.danger ? 'text-rose-600' : 'text-slate-700'}`}
            >
              {item.label}
            </button>
          ))}
      </div>
    </>,
    document.body,
  );
}

// ── Summary cards (§2) ──────────────────────────────────────────────────────
function SummaryCards({ stats, loading }) {
  const cards = [
    { key: 'total', label: 'Total Students', value: stats?.total, accent: 'text-slate-800' },
    { key: 'active', label: 'Active', value: stats?.active, accent: 'text-emerald-600' },
    { key: 'inactive', label: 'Inactive', value: stats?.inactive, accent: 'text-slate-500' },
    { key: 'pending', label: 'Pending Enrollment', value: stats?.pending, accent: 'text-amber-600' },
    { key: 'new', label: 'New This Year', value: stats?.new_this_year, accent: 'text-violet-600' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.key} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em]">{c.label}</p>
          {loading
            ? <div className="h-7 w-10 bg-slate-100 rounded animate-pulse mt-1.5" />
            : <p className={`text-2xl font-black tabular-nums mt-0.5 ${c.accent}`}>{c.value ?? 0}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Filter bar (§4, §5) ─────────────────────────────────────────────────────
function FilterBar({ dir, classrooms, searching }) {
  const urlQ = dir.get('q');
  const [searchText, setSearchText] = useState(urlQ);

  // Local input → URL (debounced 300ms).
  useEffect(() => {
    if (searchText === urlQ) return undefined;
    const t = setTimeout(() => dir.setParam('q', searchText), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);
  // URL → local (clear filters, back button, deep link).
  useEffect(() => { setSearchText(urlQ); }, [urlQ]);

  const grade = dir.get('grade');
  const section = dir.get('section');

  const gradeOptions = useMemo(() => {
    const set = new Set();
    classrooms.forEach(c => { const g = normalizeGrade(c.grade_level); if (g) set.add(g); });
    if (grade && !set.has(grade)) set.add(grade);
    return Array.from(set).sort((a, b) => {
      const na = parseInt(gradeDigit(a), 10); const nb = parseInt(gradeDigit(b), 10);
      if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b);
      return na - nb;
    });
  }, [classrooms, grade]);

  const sectionOptions = useMemo(() => {
    let list = classrooms;
    if (grade) list = list.filter(c => normalizeGrade(c.grade_level) === grade);
    if (section && !list.some(c => String(c.id) === section)) {
      list = [...list, { id: section, name: `Section ${section}` }];
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classrooms, grade, section]);

  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);
  useEffect(() => {
    const onDoc = e => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selCls = `${selectCls} appearance-none pr-7 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 20 20' fill='%2394a3b8'%3E%3Cpath d='M5.5 7.5L10 12l4.5-4.5z'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.6rem_center]`;

  const account = dir.get('account');

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
          </span>
          <input
            type="search"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search name, student ID/LRN, email…"
            aria-label="Search students"
            className="w-full pl-9 pr-9 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />
          {searching ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" aria-label="Searching" />
          ) : searchText ? (
            <button
              type="button"
              onClick={() => setSearchText('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={grade} onChange={e => dir.setParam('grade', e.target.value)} aria-label="Filter by grade" className={selCls}>
            <option value="">All grades</option>
            {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select value={section} onChange={e => dir.setParam('section', e.target.value)} aria-label="Filter by section" className={selCls}>
            <option value="">All sections</option>
            {sectionOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={dir.get('status')} onChange={e => dir.setParam('status', e.target.value)} aria-label="Filter by student status" className={selCls}>
            <option value="">Any status</option>
            {ENROLLMENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={dir.get('sex')} onChange={e => dir.setParam('sex', e.target.value)} aria-label="Filter by sex" className={selCls}>
            <option value="">Any sex</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setShowMore(v => !v)}
              aria-expanded={showMore}
              aria-haspopup="true"
              className={`${selCls} ${['account', 'date_from', 'date_to'].some(k => dir.get(k)) ? 'border-violet-300 text-violet-700 bg-violet-50' : ''}`}
            >
              More filters{dir.activeFilterCount ? ` (${dir.activeFilterCount})` : ''}
            </button>
            {showMore && (
              <div className="absolute right-0 z-40 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">Account status</label>
                  <select value={account} onChange={e => dir.setParam('account', e.target.value)} className={modalSelectCls}>
                    <option value="">Any</option>
                    <option value="active">Active</option>
                    <option value="inactive">Disabled</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending_reset">Password reset</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">Enrolled from</label>
                  <input type="date" value={dir.get('date_from')} onChange={e => dir.setParam('date_from', e.target.value)} className={modalInputCls} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">Enrolled to</label>
                  <input type="date" value={dir.get('date_to')} onChange={e => dir.setParam('date_to', e.target.value)} className={modalInputCls} />
                </div>
                <button
                  type="button"
                  onClick={() => { ['account', 'date_from', 'date_to'].forEach(k => dir.setParam(k, '')); setShowMore(false); }}
                  className="w-full text-[10px] font-bold text-slate-500 hover:text-slate-700 py-1"
                >
                  Reset these filters
                </button>
              </div>
            )}
          </div>

          {dir.activeFilterCount > 0 && (
            <button type="button" onClick={dir.clearFilters} className="text-[11px] font-bold text-violet-600 hover:text-violet-800 px-1">
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Status dialog (§13): current → new + reason ─────────────────────────────
export function StatusDialog({ student, open, onClose, onSubmit }) {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) { setStatus(''); setReason(''); setSaving(false); }
  }, [open]);
  if (!student) return null;
  const current = student.profile?.enrollment_status || 'active';

  const submit = async () => {
    if (!status) return toast.error('Select the new status');
    if (status === current) return toast.error('Status is unchanged');
    if (!reason.trim()) return toast.error('A reason is required');
    setSaving(true);
    try {
      await onSubmit(student, status, reason.trim());
      toast.success(`Status changed to ${enrollmentStatus(status).label}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change status');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <ModalTitle title="Change Student Status" subtitle={studentName(student)} />
      </ModalHeader>
      <ModalBody className="space-y-3">
        <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Current status</span>
          <Pill status={current} />
        </div>
        <ModalField label="New status" required>
          <select value={status} onChange={e => setStatus(e.target.value)} className={modalSelectCls}>
            <option value="">Select status…</option>
            {ENROLLMENT_STATUS_OPTIONS.filter(o => o.value !== current).map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Reason" required hint="Recorded in the audit trail">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            required
            placeholder="e.g. Transferred to another school"
            className={modalInputCls}
          />
        </ModalField>
      </ModalBody>
      <ModalFooter>
        <ModalBtnSecondary onClick={onClose} disabled={saving}>Cancel</ModalBtnSecondary>
        <ModalBtnPrimary onClick={submit} loading={saving} disabled={saving || !status || !reason.trim()}>
          {saving ? 'Saving…' : 'Change status'}
        </ModalBtnPrimary>
      </ModalFooter>
    </Modal>
  );
}

// ── Bulk status dialog (§14) ────────────────────────────────────────────────
function BulkStatusDialog({ count, open, onClose, onSubmit }) {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setStatus(''); setReason(''); setSaving(false); } }, [open]);

  const submit = async () => {
    if (!status || !reason.trim()) return toast.error('Select a status and give a reason');
    setSaving(true);
    try {
      await onSubmit(status, reason.trim());
      toast.success(`Status changed for ${count} student${count === 1 ? '' : 's'}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change statuses');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <ModalTitle title={`Change status · ${count} selected`} />
      </ModalHeader>
      <ModalBody className="space-y-3">
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <p className="text-[11px] font-semibold text-amber-800">
            Applies to all {count} selected students. One reason is recorded for the whole batch.
          </p>
        </div>
        <ModalField label="New status" required>
          <select value={status} onChange={e => setStatus(e.target.value)} className={modalSelectCls}>
            <option value="">Select status…</option>
            {ENROLLMENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </ModalField>
        <ModalField label="Reason" required>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} required placeholder="Why is this batch changing?" className={modalInputCls} />
        </ModalField>
      </ModalBody>
      <ModalFooter>
        <ModalBtnSecondary onClick={onClose} disabled={saving}>Cancel</ModalBtnSecondary>
        <ModalBtnPrimary onClick={submit} loading={saving} disabled={saving || !status || !reason.trim()}>
          {saving ? 'Applying…' : `Change ${count} status${count === 1 ? '' : 'es'}`}
        </ModalBtnPrimary>
      </ModalFooter>
    </Modal>
  );
}

// ── Bulk assign dialog (§14) ────────────────────────────────────────────────
function BulkAssignDialog({ count, classrooms, open, onClose, onSubmit }) {
  const [classroomId, setClassroomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  useEffect(() => { if (open) { setClassroomId(''); setSaving(false); setResult(null); } }, [open]);

  const submit = async () => {
    if (!classroomId) return toast.error('Select a section');
    setSaving(true);
    try {
      const res = await onSubmit(classroomId);
      const data = res.data;
      setResult(data);
      if (data.assigned_count > 0) {
        toast.success(`${data.assigned_count} student${data.assigned_count === 1 ? '' : 's'} assigned to ${data.classroom?.name || 'section'}`);
      }
      setSaving(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign section');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <ModalTitle title={`Assign section · ${count} selected`} />
      </ModalHeader>
      <ModalBody className="space-y-3">
        {result ? (
          <div className="space-y-2 text-xs">
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-semibold">
              {result.assigned_count} assigned · {result.already_enrolled?.length || 0} already enrolled
            </div>
            {result.skipped?.length > 0 && (
              <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-semibold">
                {result.skipped.length} skipped: {result.skipped[0]?.error}
                {result.skipped.length > 1 ? ` (+${result.skipped.length - 1} more)` : ''}
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-[11px] text-slate-500 font-medium">
              Students whose grade level doesn&apos;t match the section are skipped and reported — they are never moved incorrectly.
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2">
              {classrooms.length === 0 && <p className="text-xs text-slate-400 p-2">No sections available.</p>}
              {classrooms.map(c => {
                const full = (c.student_count ?? 0) >= (c.capacity ?? 40);
                return (
                  <label key={c.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer ${full ? 'opacity-50' : ''} ${String(classroomId) === String(c.id) ? 'bg-violet-50 border-violet-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="bulk-section" value={c.id} checked={String(classroomId) === String(c.id)} disabled={full} onChange={() => setClassroomId(c.id)} className="w-4 h-4 text-violet-600" />
                    <span className="text-xs font-bold text-slate-700">{c.name}</span>
                    <span className="ml-auto text-[10px] font-bold text-slate-400 tabular-nums">{c.student_count ?? 0}/{c.capacity ?? 40}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <ModalBtnSecondary onClick={onClose}>{result ? 'Close' : 'Cancel'}</ModalBtnSecondary>
        {!result && (
          <ModalBtnPrimary onClick={submit} loading={saving} disabled={saving || !classroomId}>
            {saving ? 'Assigning…' : `Assign ${count} student${count === 1 ? '' : 's'}`}
          </ModalBtnPrimary>
        )}
      </ModalFooter>
    </Modal>
  );
}

// ── Export dialog (§16) ─────────────────────────────────────────────────────
function ExportDialog({ open, onClose, dir, pageRows, groupBy }) {
  const [scope, setScope] = useState('page');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setScope(dir.selectedIds.length ? 'page' : 'page'); setBusy(false); } }, [open, dir.selectedIds.length]);

  const run = async (format) => {
    setBusy(true);
    try {
      let rows = pageRows;
      if (scope === 'selected') {
        // Selection can span pages → resolve through the server, filtered to
        // the active filters, then keep only the selected ids.
        rows = (await dir.fetchAllMatching()).filter(s => dir.selectedIds.includes(s.id));
      }
      if (scope === 'all') rows = await dir.fetchAllMatching();
      if (!rows || rows.length === 0) { toast.error('Nothing to export for this scope'); setBusy(false); return; }
      if (format === 'excel') exportExcel(rows);
      else if (format === 'csv') exportCsv(rows);
      else await exportPdf(rows, groupBy);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Export failed');
    }
    setBusy(false);
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <ModalTitle title="Export directory" subtitle="Honors your active filters and search" />
      </ModalHeader>
      <ModalBody className="space-y-3">
        <fieldset>
          <legend className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5">Scope</legend>
          <div className="space-y-1.5">
            {[
              { id: 'page', label: `Current page (${pageRows.length})` },
              { id: 'selected', label: `Selected students (${dir.selectedIds.length})`, disabled: dir.selectedIds.length === 0 },
              { id: 'all', label: 'All matching current filters' },
            ].map(o => (
              <label key={o.id} className={`flex items-center gap-2.5 px-3 py-2 border rounded-lg cursor-pointer ${o.disabled ? 'opacity-40' : ''} ${scope === o.id ? 'bg-violet-50 border-violet-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="export-scope" value={o.id} checked={scope === o.id} disabled={o.disabled} onChange={() => setScope(o.id)} className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-bold text-slate-700">{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => run('excel')} disabled={busy} className={`${btnBase} justify-center bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50`}>Excel</button>
          <button type="button" onClick={() => run('pdf')} disabled={busy} className={`${btnBase} justify-center bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50`}>PDF</button>
          <button type="button" onClick={() => run('csv')} disabled={busy} className={`${btnBase} justify-center bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50`}>CSV</button>
        </div>
        {busy && <p className="text-[11px] text-slate-400 text-center">Preparing export…</p>}
      </ModalBody>
    </Modal>
  );
}

// ── Main directory ──────────────────────────────────────────────────────────
export default function StudentDirectory({
  dir, user, onOpenProfile, onAdd, onImport, onResetPassword, onChat, onBadge, onDelete, onBulkDelete, onAssignSingle,
}) {
  const { academicYear, academicYears, setAcademicYear } = useAcademicYear();
  const [columns, setColumns] = useState(loadColumnPrefs);
  const [statusTarget, setStatusTarget] = useState(null);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [menu, setMenu] = useState(null); // { student, rect }
  const [helpOpen, setHelpOpen] = useState(false);

  const groupBy = dir.get('group');
  const ordering = dir.get('ordering');
  const writable = canWrite(user);
  const bulkable = canBulk(user);

  const pageRows = dir.students;
  const groups = useMemo(() => buildGroups(pageRows, groupBy), [pageRows, groupBy]);
  const pageIds = pageRows.map(s => s.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => dir.selectedIds.includes(id));
  const sorterId = activeSorterId(ordering);
  const pageCount = Math.max(1, Math.ceil(dir.count / dir.pageSize));

  const toggleColumn = (id) => {
    setColumns(prev => {
      const next = { ...prev, [id]: !prev[id] };
      saveColumnPrefs(next);
      return next;
    });
  };

  const openMenu = (student, btn) => {
    const r = btn.getBoundingClientRect();
    setMenu({ student, rect: { top: r.top, bottom: r.bottom, left: r.left } });
  };

  const actions = useMemo(() => ({
    openProfile: onOpenProfile,
    assign: onAssignSingle,
    badge: onBadge,
    reset: onResetPassword,
    chat: onChat,
    remove: onDelete,
  }), [onOpenProfile, onAssignSingle, onBadge, onResetPassword, onChat, onDelete]);

  const sortBtn = (id) => {
    const s = SORTERS[id];
    const active = sorterId === id;
    const dirArrow = active && ordering.startsWith('-') ? '↑' : '↓';
    return (
      <button
        type="button"
        onClick={() => dir.setParam('ordering', nextOrdering(ordering, id))}
        className="inline-flex items-center gap-1 hover:text-slate-700"
        aria-label={`Sort by ${s.label}`}
      >
        {s.label}
        <span className={`text-[9px] ${active ? 'text-violet-600' : 'text-slate-300'}`}>{active ? dirArrow : '↕'}</span>
      </button>
    );
  };

  // ── Loading / error / empty states ────────────────────────────────────────
  if (dir.loading) {
    return (
      <div className="space-y-5">
        <Skeleton.PageHeader />
        <SummaryCards stats={null} loading />
        <Skeleton.Table rows={6} cols={6} />
      </div>
    );
  }

  if (dir.error && dir.count === 0 && pageRows.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        <svg className="w-10 h-10 mx-auto text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
        <h3 className="text-sm font-black text-slate-700">Couldn&apos;t load the directory</h3>
        <p className="text-xs text-slate-400">{dir.error.response?.status === 403 ? 'You do not have access to student records.' : 'A network error occurred while fetching students.'}</p>
        <button type="button" onClick={dir.refetch} className={`${btnBase} bg-[#5e2a84] text-white hover:bg-violet-700 mx-auto`}>Retry</button>
      </div>
    );
  }

  const isEmpty = dir.count === 0;
  const noResults = isEmpty && dir.activeFilterCount > 0;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-800 tracking-tight">Student Directory</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Records, sections and enrollment status{dir.ayId ? '' : ' — no academic year selected'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(academicYears || []).length > 0 && (
            <select
              value={academicYear || ''}
              onChange={e => setAcademicYear(e.target.value)}
              aria-label="Academic year"
              className={`${selectCls} border-violet-200 text-violet-700 bg-violet-50/50`}
            >
              {!academicYear && <option value="">Select year…</option>}
              {(academicYears || []).map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
          )}
          {writable && (
            <>
              <button type="button" onClick={onAdd} className={`${btnBase} bg-[#5e2a84] text-white hover:bg-violet-700`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add Student
              </button>
              <button type="button" onClick={onImport} className={`${btnBase} bg-white border border-slate-200 text-slate-600 hover:border-slate-300`}>
                Import
              </button>
            </>
          )}
          <button type="button" onClick={() => setExportOpen(true)} className={`${btnBase} bg-white border border-slate-200 text-slate-600 hover:border-slate-300`}>
            Export ▾
          </button>
          <div className="relative group">
            <button type="button" className={`${btnBase} bg-white border border-slate-200 text-slate-600 hover:border-slate-300`} aria-haspopup="true" aria-label="More actions">
              More ▾
            </button>
            <div className="absolute right-0 z-30 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 hidden group-hover:block focus-within:block">
              <button type="button" onClick={downloadTemplate} className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Download import template
              </button>
              <button type="button" onClick={() => setHelpOpen(true)} className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Import format help
              </button>
            </div>
          </div>
        </div>
      </header>

      <SummaryCards stats={dir.stats} loading={dir.metaLoading} />
      <FilterBar dir={dir} classrooms={dir.classrooms} searching={dir.fetching} />

      {/* ── View controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
            Group by
            <select
              value={groupBy}
              onChange={e => dir.setParam('group', e.target.value)}
              className={`${selectCls} normal-case tracking-normal text-xs`}
              aria-label="Group students by"
            >
              {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          {/* Columns menu */}
          <div className="relative group">
            <button type="button" className={`${btnBase} bg-white border border-slate-200 text-slate-600 hover:border-slate-300`} aria-haspopup="true" aria-label="Customize columns">
              Columns ▾
            </button>
            <div className="absolute left-0 z-30 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1 hidden group-hover:block focus-within:block">
              {DIRECTORY_COLUMNS.map(c => (
                <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={!!columns[c.id]} onChange={() => toggleColumn(c.id)} className="w-3.5 h-3.5 text-violet-600 rounded" />
                  <span className="text-xs font-semibold text-slate-600">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <span className="text-[11px] font-semibold text-slate-400 tabular-nums" aria-live="polite">
            {dir.count} student{dir.count === 1 ? '' : 's'}
          </span>
        </div>

        {groupBy !== 'none' && pageRows.length > 0 && (
          <span className="text-[10px] text-slate-400 font-medium">Grouping applies to the current page</span>
        )}
      </div>

      {/* ── Bulk bar (§14) ── */}
      {writable && dir.selectedIds.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2" role="region" aria-label="Bulk actions">
          <span className="text-xs font-black text-violet-700">{dir.selectedIds.length} selected</span>
          {bulkable && (
            <>
              <button type="button" onClick={() => setBulkStatusOpen(true)} className={`${btnBase} bg-white border border-violet-200 text-violet-700 hover:bg-violet-100`}>Change Status</button>
              <button type="button" onClick={() => setBulkAssignOpen(true)} className={`${btnBase} bg-white border border-violet-200 text-violet-700 hover:bg-violet-100`}>Assign Section</button>
            </>
          )}
          <button type="button" onClick={() => setExportOpen(true)} className={`${btnBase} bg-white border border-violet-200 text-violet-700 hover:bg-violet-100`}>Export selected…</button>
          {isAdmin(user) && (
            <button type="button" onClick={onBulkDelete} className={`${btnBase} bg-rose-600 text-white hover:bg-rose-700`}>Delete</button>
          )}
          <button type="button" onClick={dir.clearSelection} className="ml-auto text-[11px] font-bold text-slate-500 hover:text-slate-700">Clear selection</button>
        </div>
      )}

      {/* ── Content ── */}
      {noResults ? (
        <div className="bg-white border border-slate-200 rounded-xl">
          <EmptyState
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>}
            title="No students match your filters"
            description="Adjust the search, filters or academic year, or clear everything to see the full directory."
            actionLabel="Clear all filters"
            onAction={dir.clearFilters}
          />
        </div>
      ) : isEmpty ? (
        <div className="bg-white border border-slate-200 rounded-xl">
          <EmptyState
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" /></svg>}
            title="No students yet"
            description="Create the first student account, or import a whole section from a CSV file."
            action={writable ? (
              <div className="flex gap-2">
                <button type="button" onClick={onAdd} className={`${btnBase} bg-[#5e2a84] text-white hover:bg-violet-700`}>Add Student</button>
                <button type="button" onClick={onImport} className={`${btnBase} bg-white border border-slate-200 text-slate-600`}>Import CSV</button>
              </div>
            ) : null}
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                  {writable && (
                    <th scope="col" className="px-3 py-2.5 w-8">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={e => dir.setManySelected(pageIds, e.target.checked)}
                        aria-label="Select all students on this page"
                        className="w-3.5 h-3.5 text-violet-600 rounded"
                      />
                    </th>
                  )}
                  <th scope="col" className="px-3 py-2.5" aria-sort={sorterId === 'student' ? (ordering.startsWith('-') ? 'descending' : 'ascending') : 'none'}>
                    {sortBtn('student')}
                  </th>
                  {columns.sex && <th scope="col" className="px-3 py-2.5">Sex</th>}
                  {columns.grade_section && <th scope="col" className="px-3 py-2.5" aria-sort={sorterId === 'grade' ? (ordering.startsWith('-') ? 'descending' : 'ascending') : 'none'}>{sortBtn('grade')} & Section</th>}
                  {columns.contact && <th scope="col" className="px-3 py-2.5">Contact</th>}
                  {columns.student_status && <th scope="col" className="px-3 py-2.5" aria-sort={sorterId === 'student_status' ? (ordering.startsWith('-') ? 'descending' : 'ascending') : 'none'}>{sortBtn('student_status')}</th>}
                  {columns.account && <th scope="col" className="px-3 py-2.5">Account</th>}
                  {columns.lrn && <th scope="col" className="px-3 py-2.5">LRN</th>}
                  {columns.date_joined && <th scope="col" className="px-3 py-2.5" aria-sort={sorterId === 'date_joined' ? (ordering.startsWith('-') ? 'descending' : 'ascending') : 'none'}>{sortBtn('date_joined')}</th>}
                  <th scope="col" className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map(group => (
                  <GroupBody
                    key={group.key}
                    group={group}
                    columns={columns}
                    writable={writable}
                    dir={dir}
                    onStatusClick={writable ? (s) => setStatusTarget(s) : undefined}
                    actions={actions}
                    onOpenMenu={openMenu}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {pageRows.map(s => {
              return (
                <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar student={s} size="w-10 h-10" />
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => onOpenProfile(s)} className="block text-sm font-black text-slate-800 hover:text-violet-700 text-left truncate w-full">
                        {studentName(s)}
                      </button>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {normalizeGrade(s.profile?.grade_level) || 'Unassigned'}
                        {s.profile?.classroom_name ? ` · ${s.profile.classroom_name}` : ''}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Pill status={s.profile?.enrollment_status} onClick={writable ? () => setStatusTarget(s) : undefined} title={writable ? 'Change student status' : undefined} />
                        {columns.account && <Pill status={s.account_status} account />}
                        {s.profile?.sex && <span className="text-[10px] font-bold text-slate-400 uppercase">{s.profile.sex}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={e => openMenu(s, e.currentTarget)}
                      aria-label={`Actions for ${studentName(s)}`}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 100-4 2 2 0 000 4zM10 12a2 2 0 100-4 2 2 0 000 4zM10 18a2 2 0 100-4 2 2 0 000 4z" /></svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                    <span className="truncate">{s.email || '—'}</span>
                    <span>Enrolled {formatDate(s.date_joined)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination (§25) */}
          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Directory pagination">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span className="tabular-nums">
                Showing {Math.min((dir.page - 1) * dir.pageSize + 1, dir.count)}–{Math.min(dir.page * dir.pageSize, dir.count)} of {dir.count}
              </span>
              <select
                value={String(dir.pageSize)}
                onChange={e => dir.setParam('size', e.target.value)}
                aria-label="Students per page"
                className="border border-slate-200 rounded-lg px-1.5 py-1 text-[11px] font-bold bg-white"
              >
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n}/page</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => dir.setParam('page', String(dir.page - 1), { keepPage: true })}
                disabled={dir.page <= 1}
                aria-label="Previous page"
                className={`${btnBase} bg-white border border-slate-200 text-slate-600 disabled:opacity-40`}
              >
                ‹ Prev
              </button>
              <span className="text-[11px] font-bold text-slate-600 tabular-nums px-1">Page {dir.page} of {pageCount}</span>
              <button
                type="button"
                onClick={() => dir.setParam('page', String(dir.page + 1), { keepPage: true })}
                disabled={dir.page >= pageCount}
                aria-label="Next page"
                className={`${btnBase} bg-white border border-slate-200 text-slate-600 disabled:opacity-40`}
              >
                Next ›
              </button>
            </div>
          </nav>
        </>
      )}

      {/* ── Dialogs ── */}
      <StatusDialog student={statusTarget} open={!!statusTarget} onClose={() => setStatusTarget(null)} onSubmit={dir.changeStudentStatus} />
      <BulkStatusDialog count={dir.selectedIds.length} open={bulkStatusOpen} onClose={() => setBulkStatusOpen(false)}
        onSubmit={async (status, reason) => { await dir.bulkChangeStatus(dir.selectedIds, status, reason); dir.clearSelection(); dir.refetch(); }} />
      <BulkAssignDialog count={dir.selectedIds.length} classrooms={dir.classrooms} open={bulkAssignOpen} onClose={() => setBulkAssignOpen(false)}
        onSubmit={async (classroomId) => { const res = await dir.bulkAssignSection(dir.selectedIds, classroomId); dir.clearSelection(); dir.refetch(); return res; }} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} dir={dir} pageRows={pageRows} groupBy={groupBy} />

      <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} size="md">
        <ModalHeader onClose={() => setHelpOpen(false)}>
          <ModalTitle title="Import format help" subtitle="CSV columns the importer expects" />
        </ModalHeader>
        <ModalBody className="space-y-3 text-xs text-slate-600">
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                <tr><th className="px-3 py-2">Student ID</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">First Name</th><th className="px-3 py-2">Last Name</th><th className="px-3 py-2">Grade Level</th><th className="px-3 py-2">Sex</th></tr>
              </thead>
              <tbody><tr><td className="px-3 py-2 font-mono">123456789012</td><td className="px-3 py-2">…@knhs.edu.ph</td><td className="px-3 py-2">Juan</td><td className="px-3 py-2">Dela Cruz</td><td className="px-3 py-2">7</td><td className="px-3 py-2">Male</td></tr></tbody>
            </table>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li><b>Student ID</b> must be a unique 12-digit LRN.</li>
            <li><b>First Name / Last Name</b> are required.</li>
            <li><b>Sex</b> accepts Male/Female (leave blank otherwise).</li>
            <li>Rows with problems are reported with their row number — valid rows still import.</li>
          </ul>
          <button type="button" onClick={downloadTemplate} className={`${btnBase} bg-[#5e2a84] text-white hover:bg-violet-700`}>Download template</button>
        </ModalBody>
      </Modal>

      {menu && (
        <RowMenu student={menu.student} rect={menu.rect} user={user} onClose={() => setMenu(null)} actions={actions} />
      )}
    </div>
  );
}

// ── Group rendering (table body) ────────────────────────────────────────────
function GroupBody({ group, columns, writable, dir, onStatusClick, actions, onOpenMenu }) {
  const colSpan = (writable ? 1 : 0) + 1 + Object.values(columns).filter(Boolean).length + 1;
  return (
    <>
      {group.label && (
        <tr className="bg-slate-100/70">
          <td colSpan={colSpan} className="px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-[0.12em]">
            {group.label}
          </td>
        </tr>
      )}
      {group.sections.map(sec => (
        <Fragment key={`${group.key}-${sec.key}`}>
          {sec.label && (
            <tr className="bg-violet-50/60">
              <td colSpan={colSpan} className="px-3 py-1 text-[9px] font-bold text-violet-600 uppercase tracking-[0.1em]">
                {sec.label}
                <span className="ml-2 text-violet-400">{sec.students.length}</span>
              </td>
            </tr>
          )}
          {sec.students.map(s => (
            <StudentRow
              key={`${group.key}-${sec.key}-${s.id}`}
              student={s}
              columns={columns}
              writable={writable}
              dir={dir}
              onStatusClick={onStatusClick}
              actions={actions}
              onOpenMenu={onOpenMenu}
            />
          ))}
        </Fragment>
      ))}
    </>
  );
}

function StudentRow({ student: s, columns, writable, dir, onStatusClick, actions, onOpenMenu }) {
  const selected = dir.isSelected(s.id);
  return (
    <tr className={`hover:bg-slate-50/80 transition-colors ${selected ? 'bg-violet-50/40' : ''}`}>
      {writable && (
        <td className="px-3 py-2.5 w-8">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => dir.toggleSelect(s.id)}
            aria-label={`Select ${studentName(s)}`}
            className="w-3.5 h-3.5 text-violet-600 rounded"
          />
        </td>
      )}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar student={s} />
          <div className="min-w-0">
            <button type="button" onClick={() => actions.openProfile(s)} className="block text-xs font-black text-slate-800 hover:text-violet-700 truncate max-w-[220px] text-left">
              {studentName(s)}
            </button>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[220px]">
              {s.profile?.lrn ? `LRN: ${s.profile.lrn}` : (s.email || '—')}
            </p>
          </div>
        </div>
      </td>
      {columns.sex && <td className="px-3 py-2.5 text-xs font-semibold text-slate-500 capitalize">{s.profile?.sex || '—'}</td>}
      {columns.grade_section && (
        <td className="px-3 py-2.5 text-xs font-semibold text-slate-600">
          <span className="block">{normalizeGrade(s.profile?.grade_level) || 'Unassigned'}</span>
          <span className="block text-[10px] text-slate-400">{s.profile?.classroom_name || 'No section'}</span>
        </td>
      )}
      {columns.contact && <td className="px-3 py-2.5 text-[11px] text-slate-500 font-medium max-w-[180px] truncate">{s.email || '—'}</td>}
      {columns.student_status && (
        <td className="px-3 py-2.5">
          <Pill status={s.profile?.enrollment_status} onClick={onStatusClick ? () => onStatusClick(s) : undefined} title={onStatusClick ? 'Change student status' : undefined} />
        </td>
      )}
      {columns.account && <td className="px-3 py-2.5"><Pill status={s.account_status} account /></td>}
      {columns.lrn && <td className="px-3 py-2.5 text-[11px] font-mono text-slate-500">{studentLrn(s)}</td>}
      {columns.date_joined && <td className="px-3 py-2.5 text-[11px] text-slate-500 font-medium whitespace-nowrap">{formatDate(s.date_joined)}</td>}
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          onClick={e => onOpenMenu(s, e.currentTarget)}
          aria-label={`Actions for ${studentName(s)}`}
          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 100-4 2 2 0 000 4zM10 12a2 2 0 100-4 2 2 0 000 4zM10 18a2 2 0 100-4 2 2 0 000 4z" /></svg>
        </button>
      </td>
    </tr>
  );
}
