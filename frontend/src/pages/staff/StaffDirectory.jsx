/**
 * StaffDirectory — the Staff tab of /people (formerly "Teachers").
 *
 * URL-driven (deep-linkable), server-queried (search/filters/sort/pagination),
 * with summary cards from real stats, group-by, column customization, bulk
 * actions, distinct loading/empty/error states and a mobile card layout.
 */
import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import {
  Skeleton, EmptyState, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
  ModalField, ModalBtnPrimary, ModalBtnSecondary, modalInputCls, modalSelectCls,
} from '../../components/ui';
import { useAcademicYear } from '../../context/AcademicYearContext';
import toast from 'react-hot-toast';
import { accountStatus, formatDate } from '../students/directoryHelpers';
import { exportStaffExcel, exportStaffCsv, exportStaffPdf } from './exportStaff';
import {
  STAFF_TITLES, getStaffTitleLabel, deptLabel, staffName, staffInitials, staffSex,
  resolvePhoto, STAFF_COLUMNS, loadStaffColumnPrefs, saveStaffColumnPrefs,
  STAFF_SORTERS, STAFF_GROUP_OPTIONS, buildStaffGroups, downloadStaffTemplate,
} from './staffHelpers';

const PAGE_SIZES = [10, 25, 50, 100];
const btnBase = 'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-[0.08em] rounded-lg transition-colors';
const selectCls = `${btnBase} bg-white border border-slate-200 text-slate-600 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-200`;

function canWrite(user) { return user?.role === 'admin' || user?.role === 'staff'; }
function isAdmin(user) { return user?.role === 'admin'; }

function nextOrdering(current, sorterId) {
  const field = STAFF_SORTERS[sorterId].field;
  if (current === field) return `-${field}`;
  if (current === `-${field}`) return field;
  return field;
}

function activeSorterId(ordering) {
  if (!ordering) return null;
  const bare = ordering.startsWith('-') ? ordering.slice(1) : ordering;
  const hit = Object.entries(STAFF_SORTERS).find(([, v]) => v.field === bare);
  return hit ? hit[0] : null;
}

function AccountPill({ status, onClick, title }) {
  const info = accountStatus(status);
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

function Avatar({ staff, size = 'w-8 h-8' }) {
  const [imgError, setImgError] = useState(false);
  const photo = resolvePhoto(staff);
  if (photo && !imgError) {
    return (
      <img
        src={photo}
        alt=""
        className={`${size} rounded-full object-cover object-top border border-slate-200 shrink-0`}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <span className={`${size} rounded-full bg-violet-100 text-violet-700 border border-violet-200 flex items-center justify-center text-[11px] font-black shrink-0`}>
      {staffInitials(staff)}
    </span>
  );
}

// ── Row actions menu (portaled so table overflow can't clip it) ─────────────
function RowMenu({ staff, rect, user, onClose, actions }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!rect) return null;

  const items = [
    { id: 'profile', label: 'View Profile', onClick: () => actions.openProfile(staff) },
    ...(canWrite(user) ? [
      { id: 'chat', label: 'Message', onClick: () => actions.chat(staff) },
      { id: 'reset', label: 'Reset Password', onClick: () => actions.reset(staff) },
    ] : []),
    ...(isAdmin(user) ? [
      { id: 'edit', label: 'Edit Record', onClick: () => actions.edit(staff) },
      { id: 'roles', label: 'Manage Roles', onClick: () => actions.roles(staff) },
      ...((staff.role === 'staff' || (staff.is_admin && staff.staff_title)) ? [
        { id: 'admin', label: staff.is_admin ? 'Remove Admin' : 'Make Admin', onClick: () => actions.toggleAdmin(staff) },
      ] : []),
      { id: 'sep1', sep: true },
      { id: 'delete', label: 'Delete Staff', danger: true, onClick: () => actions.remove(staff) },
    ] : []),
  ];

  const top = Math.min(rect.bottom + 4, window.innerHeight - 40 - items.length * 34);
  const left = Math.min(rect.left, window.innerWidth - 200);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} aria-hidden="true" />
      <div role="menu" className="fixed z-[9999] w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 overflow-hidden" style={{ top, left }}>
        {items.map((item) => (item.sep
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
          )))}
      </div>
    </>,
    document.body,
  );
}

// ── Summary cards ───────────────────────────────────────────────────────────
function SummaryCards({ stats, loading }) {
  const cards = [
    { key: 'total', label: 'Total Staff', value: stats?.total, accent: 'text-slate-800' },
    { key: 'active', label: 'Active', value: stats?.active, accent: 'text-emerald-600' },
    { key: 'suspended', label: 'Suspended', value: stats?.suspended, accent: 'text-rose-600' },
    { key: 'pending', label: 'Pending Reset', value: stats?.pending_reset, accent: 'text-amber-600' },
    { key: 'new', label: 'New This Year', value: stats?.new_this_year, accent: 'text-violet-600' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
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

// ── Filter bar ──────────────────────────────────────────────────────────────
function FilterBar({ dir, departments, searching }) {
  const urlQ = dir.get('q');
  const [searchText, setSearchText] = useState(urlQ);

  useEffect(() => {
    if (searchText === urlQ) return undefined;
    const t = setTimeout(() => dir.setParam('q', searchText), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);
  useEffect(() => { setSearchText(urlQ); }, [urlQ]);

  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selCls = `${selectCls} appearance-none pr-7 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 20 20' fill='%2394a3b8'%3E%3Cpath d='M5.5 7.5L10 12l4.5-4.5z'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.6rem_center]`;

  const rank = dir.get('rank');
  const department = dir.get('department');

  const rankOptions = useMemo(() => {
    const set = new Set();
    STAFF_TITLES.forEach((t) => set.add(t.value));
    if (rank) set.add(rank);
    return Array.from(set);
  }, [rank]);

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
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search name, email, employee ID…"
            aria-label="Search staff"
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
          <select value={rank} onChange={(e) => dir.setParam('rank', e.target.value)} aria-label="Filter by staff role" className={selCls}>
            <option value="">All roles</option>
            {rankOptions.map((v) => <option key={v} value={v}>{getStaffTitleLabel(v)}</option>)}
          </select>

          <select value={department} onChange={(e) => dir.setParam('department', e.target.value)} aria-label="Filter by department" className={selCls}>
            <option value="">All departments</option>
            {department && !departments.some((d) => String(d.id) === department) && (
              <option value={department}>Department {department}</option>
            )}
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select value={dir.get('account')} onChange={(e) => dir.setParam('account', e.target.value)} aria-label="Filter by account status" className={selCls}>
            <option value="">Any account</option>
            <option value="active">Active</option>
            <option value="inactive">Disabled</option>
            <option value="suspended">Suspended</option>
            <option value="pending_reset">Password reset</option>
          </select>

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              aria-haspopup="true"
              className={`${selCls} ${['role', 'date_from', 'date_to'].some((k) => dir.get(k)) ? 'border-violet-300 text-violet-700 bg-violet-50' : ''}`}
            >
              More filters{dir.activeFilterCount ? ` (${dir.activeFilterCount})` : ''}
            </button>
            {showMore && (
              <div className="absolute right-0 z-40 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">Additional role</label>
                  <select value={dir.get('role')} onChange={(e) => dir.setParam('role', e.target.value)} className={modalSelectCls}>
                    <option value="">Any</option>
                    {STAFF_TITLES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">Joined from</label>
                  <input type="date" value={dir.get('date_from')} onChange={(e) => dir.setParam('date_from', e.target.value)} className={modalInputCls} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">Joined to</label>
                  <input type="date" value={dir.get('date_to')} onChange={(e) => dir.setParam('date_to', e.target.value)} className={modalInputCls} />
                </div>
                <button
                  type="button"
                  onClick={() => { ['role', 'date_from', 'date_to'].forEach((k) => dir.setParam(k, '')); setShowMore(false); }}
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

// ── Account-status dialog: current → new + reason (audit trail) ─────────────
export function StaffStatusDialog({ staff, open, onClose, onSubmit }) {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) { setStatus(''); setReason(''); setSaving(false); }
  }, [open]);
  if (!staff) return null;
  const current = staff.account_status || 'active';

  const submit = async () => {
    if (!status) return toast.error('Select the new status');
    if (status === current) return toast.error('Status is unchanged');
    if (!reason.trim()) return toast.error('A reason is required');
    setSaving(true);
    try {
      await onSubmit(staff, status, reason.trim());
      toast.success(`Status changed to ${accountStatus(status).label}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change status');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <ModalTitle title="Change Account Status" subtitle={staffName(staff)} />
      </ModalHeader>
      <ModalBody className="space-y-3">
        <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Current status</span>
          <AccountPill status={current} />
        </div>
        <ModalField label="New status" required>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={modalSelectCls}>
            <option value="">Select status…</option>
            {['active', 'inactive', 'suspended', 'pending_reset']
              .filter((v) => v !== current)
              .map((v) => <option key={v} value={v}>{accountStatus(v).label}</option>)}
          </select>
        </ModalField>
        <ModalField label="Reason" required hint="Recorded in the audit trail">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="e.g. On leave until further notice"
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

// ── Bulk status dialog ──────────────────────────────────────────────────────
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
      toast.success(`Status changed for ${count} account${count === 1 ? '' : 's'}`);
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
            Applies to all {count} selected accounts. One reason is recorded for the whole batch.
          </p>
        </div>
        <ModalField label="New status" required>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={modalSelectCls}>
            <option value="">Select status…</option>
            {['active', 'inactive', 'suspended', 'pending_reset'].map((v) => (
              <option key={v} value={v}>{accountStatus(v).label}</option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Reason" required>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required placeholder="Why is this batch changing?" className={modalInputCls} />
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

// ── Export dialog ───────────────────────────────────────────────────────────
function ExportDialog({ open, onClose, dir, pageRows, groupBy }) {
  const [scope, setScope] = useState('page');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setScope('page'); setBusy(false); } }, [open]);

  const run = async (format) => {
    setBusy(true);
    try {
      let rows = pageRows;
      if (scope === 'selected') {
        rows = (await dir.fetchAllMatching()).filter((s) => dir.selectedIds.includes(s.id));
      }
      if (scope === 'all') rows = await dir.fetchAllMatching();
      if (!rows || rows.length === 0) { toast.error('Nothing to export for this scope'); setBusy(false); return; }
      if (format === 'excel') exportStaffExcel(rows);
      else if (format === 'csv') exportStaffCsv(rows);
      else await exportStaffPdf(rows, groupBy);
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
              { id: 'selected', label: `Selected staff (${dir.selectedIds.length})`, disabled: dir.selectedIds.length === 0 },
              { id: 'all', label: 'All matching current filters' },
            ].map((o) => (
              <label key={o.id} className={`flex items-center gap-2.5 px-3 py-2 border rounded-lg cursor-pointer ${o.disabled ? 'opacity-40' : ''} ${scope === o.id ? 'bg-violet-50 border-violet-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="staff-export-scope" value={o.id} checked={scope === o.id} disabled={o.disabled} onChange={() => setScope(o.id)} className="w-4 h-4 text-violet-600" />
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
export default function StaffDirectory({
  dir, user, onOpenProfile, onAdd, onImport, onResetPassword, onChat,
  onEdit, onRoles, onToggleAdmin, onDelete, onBulkDelete, onBulkStatus, onStatusChange,
}) {
  const { academicYear, academicYears, setAcademicYear } = useAcademicYear();
  const [columns, setColumns] = useState(loadStaffColumnPrefs);
  const [statusTarget, setStatusTarget] = useState(null);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const groupBy = dir.get('group');
  const ordering = dir.get('ordering');
  const writable = canWrite(user);
  const adminUser = isAdmin(user);

  const pageRows = dir.staff;
  const groups = useMemo(() => buildStaffGroups(pageRows, groupBy), [pageRows, groupBy]);
  const pageIds = pageRows.map((s) => s.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => dir.selectedIds.includes(id));
  const sorterId = activeSorterId(ordering);
  const pageCount = Math.max(1, Math.ceil(dir.count / dir.pageSize));

  const toggleColumn = (id) => {
    setColumns((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveStaffColumnPrefs(next);
      return next;
    });
  };

  const openMenu = (staff, btn) => {
    const r = btn.getBoundingClientRect();
    setMenu({ staff, rect: { top: r.top, bottom: r.bottom, left: r.left } });
  };

  const actions = useMemo(() => ({
    openProfile: onOpenProfile,
    chat: onChat,
    reset: onResetPassword,
    edit: onEdit,
    roles: onRoles,
    toggleAdmin: onToggleAdmin,
    remove: onDelete,
  }), [onOpenProfile, onChat, onResetPassword, onEdit, onRoles, onToggleAdmin, onDelete]);

  const sortBtn = (id) => {
    const s = STAFF_SORTERS[id];
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
        <p className="text-xs text-slate-400">{dir.error.response?.status === 403 ? 'You do not have access to staff records.' : 'A network error occurred while fetching staff.'}</p>
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
          <h1 className="text-lg font-black text-slate-800 tracking-tight">Staff Directory</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Teaching and non-teaching personnel{dir.ayId ? '' : ' — no academic year selected'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(academicYears || []).length > 0 && (
            <select
              value={academicYear || ''}
              onChange={(e) => setAcademicYear(e.target.value)}
              aria-label="Academic year"
              className={`${selectCls} border-violet-200 text-violet-700 bg-violet-50/50`}
            >
              {!academicYear && <option value="">Select year…</option>}
              {(academicYears || []).map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
          )}
          {writable && (
            <>
              <button type="button" onClick={onAdd} className={`${btnBase} bg-[#5e2a84] text-white hover:bg-violet-700`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add Staff
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
              <button type="button" onClick={downloadStaffTemplate} className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
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
      <FilterBar dir={dir} departments={dir.departments} searching={dir.fetching} />

      {/* ── View controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
            Group by
            <select
              value={groupBy}
              onChange={(e) => dir.setParam('group', e.target.value)}
              className={`${selectCls} normal-case tracking-normal text-xs`}
              aria-label="Group staff by"
            >
              {STAFF_GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <div className="relative group">
            <button type="button" className={`${btnBase} bg-white border border-slate-200 text-slate-600 hover:border-slate-300`} aria-haspopup="true" aria-label="Customize columns">
              Columns ▾
            </button>
            <div className="absolute left-0 z-30 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1 hidden group-hover:block focus-within:block">
              {STAFF_COLUMNS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={!!columns[c.id]} onChange={() => toggleColumn(c.id)} className="w-3.5 h-3.5 text-violet-600 rounded" />
                  <span className="text-xs font-semibold text-slate-600">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <span className="text-[11px] font-semibold text-slate-400 tabular-nums" aria-live="polite">
            {dir.count} staff member{dir.count === 1 ? '' : 's'}
          </span>
        </div>

        {groupBy !== 'none' && pageRows.length > 0 && (
          <span className="text-[10px] text-slate-400 font-medium">Grouping applies to the current page</span>
        )}
      </div>

      {/* ── Bulk bar ── */}
      {writable && dir.selectedIds.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2" role="region" aria-label="Bulk actions">
          <span className="text-xs font-black text-violet-700">{dir.selectedIds.length} selected</span>
          {adminUser && (
            <button type="button" onClick={() => setBulkStatusOpen(true)} className={`${btnBase} bg-white border border-violet-200 text-violet-700 hover:bg-violet-100`}>Change Status</button>
          )}
          <button type="button" onClick={() => setExportOpen(true)} className={`${btnBase} bg-white border border-violet-200 text-violet-700 hover:bg-violet-100`}>Export selected…</button>
          {adminUser && (
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
            title="No staff match your filters"
            description="Adjust the search, filters or role, or clear everything to see the full directory."
            actionLabel="Clear all filters"
            onAction={dir.clearFilters}
          />
        </div>
      ) : isEmpty ? (
        <div className="bg-white border border-slate-200 rounded-xl">
          <EmptyState
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            title="No staff accounts yet"
            description="Create the first staff account, or import a whole department from a CSV file."
            action={writable ? (
              <div className="flex gap-2">
                <button type="button" onClick={onAdd} className={`${btnBase} bg-[#5e2a84] text-white hover:bg-violet-700`}>Add Staff</button>
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
                        onChange={(e) => dir.setManySelected(pageIds, e.target.checked)}
                        aria-label="Select all staff on this page"
                        className="w-3.5 h-3.5 text-violet-600 rounded"
                      />
                    </th>
                  )}
                  <th scope="col" className="px-3 py-2.5" aria-sort={sorterId === 'staff' ? (ordering.startsWith('-') ? 'descending' : 'ascending') : 'none'}>
                    {sortBtn('staff')}
                  </th>
                  {columns.sex && <th scope="col" className="px-3 py-2.5">Sex</th>}
                  {columns.rank && <th scope="col" className="px-3 py-2.5" aria-sort={sorterId === 'rank' ? (ordering.startsWith('-') ? 'descending' : 'ascending') : 'none'}>{sortBtn('rank')}</th>}
                  {columns.department && <th scope="col" className="px-3 py-2.5">Department</th>}
                  {columns.contact && <th scope="col" className="px-3 py-2.5">Contact</th>}
                  {columns.adviser && <th scope="col" className="px-3 py-2.5">Adviser</th>}
                  {columns.account && <th scope="col" className="px-3 py-2.5" aria-sort={sorterId === 'account' ? (ordering.startsWith('-') ? 'descending' : 'ascending') : 'none'}>{sortBtn('account')}</th>}
                  {columns.date_joined && <th scope="col" className="px-3 py-2.5" aria-sort={sorterId === 'date_joined' ? (ordering.startsWith('-') ? 'descending' : 'ascending') : 'none'}>{sortBtn('date_joined')}</th>}
                  <th scope="col" className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((group) => (
                  <GroupBody
                    key={group.key}
                    group={group}
                    columns={columns}
                    writable={writable}
                    dir={dir}
                    onStatusClick={adminUser ? (s) => setStatusTarget(s) : undefined}
                    actions={actions}
                    onOpenMenu={openMenu}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {pageRows.map((s) => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-start gap-3">
                  <Avatar staff={s} size="w-10 h-10" />
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => onOpenProfile(s)} className="block text-sm font-black text-slate-800 hover:text-violet-700 text-left truncate w-full">
                      {staffName(s)}
                    </button>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {getStaffTitleLabel(s.staff_title)}
                      {deptLabel(s) ? ` · ${deptLabel(s)}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <AccountPill status={s.account_status} onClick={adminUser ? () => setStatusTarget(s) : undefined} title={adminUser ? 'Change account status' : undefined} />
                      {staffSex(s) && <span className="text-[10px] font-bold text-slate-400 uppercase">{staffSex(s)}</span>}
                      {s.must_change_password && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Temp PW</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => openMenu(s, e.currentTarget)}
                    aria-label={`Actions for ${staffName(s)}`}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 100-4 2 2 0 000 4zM10 12a2 2 0 100-4 2 2 0 000 4zM10 18a2 2 0 100-4 2 2 0 000 4z" /></svg>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                  <span className="truncate">{s.email || '—'}</span>
                  <span>Joined {formatDate(s.date_joined)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Directory pagination">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span className="tabular-nums">
                Showing {Math.min((dir.page - 1) * dir.pageSize + 1, dir.count)}–{Math.min(dir.page * dir.pageSize, dir.count)} of {dir.count}
              </span>
              <select
                value={String(dir.pageSize)}
                onChange={(e) => dir.setParam('size', e.target.value)}
                aria-label="Staff per page"
                className="border border-slate-200 rounded-lg px-1.5 py-1 text-[11px] font-bold bg-white"
              >
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}/page</option>)}
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
      <StaffStatusDialog
        staff={statusTarget}
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onSubmit={async (target, status, reason) => {
          await onStatusChange(target, status, reason);
          dir.refetch();
        }}
      />
      <BulkStatusDialog
        count={dir.selectedIds.length}
        open={bulkStatusOpen}
        onClose={() => setBulkStatusOpen(false)}
        onSubmit={async (status, reason) => {
          await onBulkStatus(dir.selectedIds, status, reason);
          dir.clearSelection();
          dir.refetch();
        }}
      />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} dir={dir} pageRows={pageRows} groupBy={groupBy} />

      <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} size="md">
        <ModalHeader onClose={() => setHelpOpen(false)}>
          <ModalTitle title="Import format help" subtitle="CSV columns the importer expects" />
        </ModalHeader>
        <ModalBody className="space-y-3 text-xs text-slate-600">
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                <tr><th className="px-3 py-2">Email</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">First Name</th><th className="px-3 py-2">Last Name</th><th className="px-3 py-2">Staff Title</th><th className="px-3 py-2">Sex</th></tr>
              </thead>
              <tbody><tr><td className="px-3 py-2">…@knhs.edu.ph</td><td className="px-3 py-2">Mr.</td><td className="px-3 py-2">Juan</td><td className="px-3 py-2">Dela Cruz</td><td className="px-3 py-2 font-mono">teacher_i</td><td className="px-3 py-2">Male</td></tr></tbody>
            </table>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li><b>Email</b> must be unique — it is also the login username.</li>
            <li><b>First Name / Last Name</b> are required.</li>
            <li><b>Staff Title</b> is a DepEd rank code such as <code className="font-mono">teacher_i</code> or <code className="font-mono">registrar</code>; anything unrecognised falls back to a generic teacher.</li>
            <li>Rows with problems are reported with their row number — valid rows still import.</li>
          </ul>
          <button type="button" onClick={downloadStaffTemplate} className={`${btnBase} bg-[#5e2a84] text-white hover:bg-violet-700`}>Download template</button>
        </ModalBody>
      </Modal>

      {menu && (
        <RowMenu staff={menu.staff} rect={menu.rect} user={user} onClose={() => setMenu(null)} actions={actions} />
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
            <span className="ml-2 text-slate-400">{group.sections.reduce((n, s) => n + s.staff.length, 0)}</span>
          </td>
        </tr>
      )}
      {group.sections.map((sec) => (
        <Fragment key={`${group.key}-${sec.key}`}>
          {sec.label && (
            <tr className="bg-violet-50/60">
              <td colSpan={colSpan} className="px-3 py-1 text-[9px] font-bold text-violet-600 uppercase tracking-[0.1em]">
                {sec.label}
                <span className="ml-2 text-violet-400">{sec.staff.length}</span>
              </td>
            </tr>
          )}
          {sec.staff.map((s) => (
            <StaffRow
              key={`${group.key}-${sec.key}-${s.id}`}
              staff={s}
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

function StaffRow({ staff: s, columns, writable, dir, onStatusClick, actions, onOpenMenu }) {
  const selected = dir.isSelected(s.id);
  const classrooms = dir.classrooms || [];
  const advisory = classrooms.find((c) => c.teacher === s.id);
  return (
    <tr className={`hover:bg-slate-50/80 transition-colors ${selected ? 'bg-violet-50/40' : ''}`}>
      {writable && (
        <td className="px-3 py-2.5 w-8">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => dir.toggleSelect(s.id)}
            aria-label={`Select ${staffName(s)}`}
            className="w-3.5 h-3.5 text-violet-600 rounded"
          />
        </td>
      )}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar staff={s} />
          <div className="min-w-0">
            <button type="button" onClick={() => actions.openProfile(s)} className="block text-xs font-black text-slate-800 hover:text-violet-700 truncate max-w-[220px] text-left">
              {staffName(s)}
            </button>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[220px]">
              {s.email || '—'}
            </p>
          </div>
          {s.is_admin && (
            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">Admin</span>
          )}
        </div>
      </td>
      {columns.sex && <td className="px-3 py-2.5 text-xs font-semibold text-slate-500 capitalize">{staffSex(s) || '—'}</td>}
      {columns.rank && (
        <td className="px-3 py-2.5 text-xs font-semibold text-slate-600">
          <span className="block">{getStaffTitleLabel(s.staff_title)}</span>
          {(s.additional_roles || '').split(',').filter(Boolean).length > 0 && (
            <span className="block text-[10px] text-slate-400">
              +{(s.additional_roles || '').split(',').filter(Boolean).map((r) => getStaffTitleLabel(r)).join(', ')}
            </span>
          )}
        </td>
      )}
      {columns.department && <td className="px-3 py-2.5 text-xs font-semibold text-slate-600 max-w-[160px] truncate">{deptLabel(s) || <span className="text-slate-400 italic">No department</span>}</td>}
      {columns.contact && <td className="px-3 py-2.5 text-[11px] text-slate-500 font-medium max-w-[180px] truncate">{s.profile?.phone_number || s.email || '—'}</td>}
      {columns.adviser && (
        <td className="px-3 py-2.5 text-[11px] font-semibold">
          {advisory ? (
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">{advisory.name}</span>
          ) : (
            <span className="text-slate-400">{s.is_adviser ? 'Adviser' : '—'}</span>
          )}
        </td>
      )}
      {columns.account && (
        <td className="px-3 py-2.5">
          <AccountPill status={s.account_status} onClick={onStatusClick ? () => onStatusClick(s) : undefined} title={onStatusClick ? 'Change account status' : undefined} />
        </td>
      )}
      {columns.date_joined && <td className="px-3 py-2.5 text-[11px] text-slate-500 font-medium whitespace-nowrap">{formatDate(s.date_joined)}</td>}
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          onClick={(e) => onOpenMenu(s, e.currentTarget)}
          aria-label={`Actions for ${staffName(s)}`}
          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 100-4 2 2 0 000 4zM10 12a2 2 0 100-4 2 2 0 000 4zM10 18a2 2 0 100-4 2 2 0 000 4z" /></svg>
        </button>
      </td>
    </tr>
  );
}
