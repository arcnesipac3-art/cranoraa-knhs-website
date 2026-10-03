import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import { MODULE_KEYS, groupSelected, normalizeGroups, summarizeModules } from '../constants/modules';

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusBadge = (isActive) =>
  isActive
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-slate-100 text-slate-500 border-slate-200';

const moduleToneBadge = (tone) =>
  tone === 'all'
    ? 'bg-violet-100 text-violet-700 border-violet-200'
    : tone === 'none'
      ? 'bg-slate-100 text-slate-500 border-slate-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';

const EMPTY_FORM = { name: '', code: '', description: '', head: '', is_active: true, modules: MODULE_KEYS };

/** Compact module-grant badge used in the table. */
function ModuleCell({ modules }) {
  const summary = summarizeModules(modules);
  return (
    <span
      title={`${summary.count} of ${MODULE_KEYS.length} modules`}
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${moduleToneBadge(summary.tone)}`}
    >
      {summary.text}
    </span>
  );
}

// ── Department Form Modal ─────────────────────────────────────────────────────
function DepartmentModal({ isOpen, onClose, onSave, editing, eligibleHeads, moduleGroups }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || '',
        code: editing.code || '',
        description: editing.description || '',
        head: editing.head || '',
        is_active: editing.is_active !== false,
        // The API always returns a concrete effective list; a department that
        // has never been configured comes back with every module.
        modules: Array.isArray(editing.modules) ? editing.modules : MODULE_KEYS,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [editing, isOpen]);

  if (!isOpen) return null;

  const toggleModule = (key) =>
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(key)
        ? prev.modules.filter((k) => k !== key)
        : [...prev.modules, key],
    }));

  const allSelected = form.modules.length === MODULE_KEYS.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, head: form.head || null };
      // Every module selected is stored as NULL ("not yet configured"), so a
      // department that grants everything keeps granting newly added modules
      // too, instead of freezing a snapshot of today's list.
      payload.modules = allSelected ? null : form.modules;
      if (editing) {
        await api.patch(`/departments/${editing.id}/`, payload);
        toast.success('Department updated');
      } else {
        await api.post('/departments/', payload);
        toast.success('Department created');
      }
      onSave();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.name) setError(`Name: ${data.name[0]}`);
      else if (data?.code) setError(`Code: ${data.code[0]}`);
      else if (data?.head) setError(data.head[0]);
      else if (data?.modules) setError(Array.isArray(data.modules) ? data.modules[0] : data.modules);
      else if (data?.error) setError(data.error);
      else setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {editing ? 'Edit Department' : 'Create Department'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="e.g. Registrar"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department Code *</label>
              <input
                type="text" required value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="e.g. REG"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              placeholder="Brief description of the department..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department Head (optional)</label>
            <select
              value={form.head}
              onChange={(e) => setForm({ ...form, head: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">— No head assigned —</option>
              {eligibleHeads.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.username}
                </option>
              ))}
            </select>
          </div>
          {/* ── Module Access ─────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Module Access</label>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, modules: MODULE_KEYS })}
                  className="text-violet-600 hover:text-violet-800"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, modules: [] })}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Clear all
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Modules personnel in this department may open. This only ever <em>narrows</em> what
              their role already allows — it never grants extra access.
            </p>
            <div className="border border-slate-200 rounded-lg p-3 space-y-3 max-h-52 overflow-y-auto bg-slate-50/50">
              {moduleGroups.map((group) => (
                <div key={group.key}>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {group.modules.map((m) => (
                      <label key={m.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.modules.includes(m.key)}
                          onChange={() => toggleModule(m.key)}
                          className="rounded border-slate-300 text-violet-600"
                        />
                        <span className="truncate">{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              <span className="font-semibold text-violet-700">{form.modules.length}</span>
              {' '}of {MODULE_KEYS.length} modules selected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="is_active" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-slate-300 text-violet-600"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700 font-medium">Active</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assign Personnel Modal ────────────────────────────────────────────────────
function AssignModal({ isOpen, onClose, onSave, department, eligibleUsers }) {
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setUserId(''); setError(''); }, [isOpen]);
  if (!isOpen) return null;

  const handleAssign = async () => {
    if (!userId) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/departments/${department.id}/assign_member/`, { user_id: parseInt(userId) });
      toast.success('Member assigned');
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Filter out already-assigned members
  const memberIds = new Set((department?.members || []).map((m) => m.id));
  const available = eligibleUsers.filter((u) => !memberIds.has(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Assign Personnel</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600">
            Assign to <span className="font-semibold text-violet-700">{department?.name}</span>
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
          >
            <option value="">— Select a person —</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.username} ({u.role})
              </option>
            ))}
          </select>
          {available.length === 0 && (
            <p className="text-sm text-slate-400 text-center">All eligible users are already assigned.</p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={handleAssign} disabled={!userId || saving}
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Module access summary (detail drawer) ─────────────────────────────────────
function ModuleAccessSummary({ modules }) {
  const keys = Array.isArray(modules) ? modules : [];
  const summary = summarizeModules(keys);

  if (summary.tone === 'all') {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
        <p className="text-sm font-semibold text-violet-700">{summary.text}</p>
        <p className="text-xs text-violet-600/80 mt-0.5">
          This department does not restrict its personnel — they keep everything their role allows.
        </p>
      </div>
    );
  }

  if (keys.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-sm font-semibold text-slate-600">No modules granted</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Personnel here only reach modules granted by another department they also belong to.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${moduleToneBadge(summary.tone)}`}>
        {summary.text}
      </span>
      {groupSelected(keys).map((g) => (
        <div key={g.key}>
          <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.modules.map((m) => (
              <span
                key={m.key}
                className="px-2 py-0.5 rounded-md bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold"
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Department Detail Drawer ──────────────────────────────────────────────────
function DetailDrawer({ department, onClose, onEdit, onAssign, onRemoveMember, isAdmin }) {
  if (!department) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-violet-600 tracking-wider">{department.code}</p>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">{department.name}</h2>
            <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(department.is_active)}`}>
              {department.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {department.description && (
            <p className="text-sm text-slate-600">{department.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 tracking-wide">Department Head</p>
              <p className="mt-1 font-medium text-slate-800">{department.head_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 tracking-wide">Personnel</p>
              <p className="mt-1 font-medium text-slate-800">{department.member_count || 0}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 tracking-wide">Created</p>
              <p className="mt-1 text-slate-600">{new Date(department.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 tracking-wide">Last Updated</p>
              <p className="mt-1 text-slate-600">{new Date(department.updated_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Module access */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 tracking-wider">Module Access</p>
              {isAdmin && (
                <button
                  onClick={onEdit}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-800"
                >
                  Edit
                </button>
              )}
            </div>
            <ModuleAccessSummary modules={department.modules} />
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-700 tracking-wider">Personnel</p>
              {isAdmin && department.is_active && (
                <button
                  onClick={onAssign}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Assign
                </button>
              )}
            </div>
            {isAdmin && !department.is_active && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                This department is archived, so new personnel cannot be assigned to it.
                Existing assignments and module access are preserved.
              </p>
            )}
            {(!department.members || department.members.length === 0) ? (
              <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                No personnel assigned yet
              </div>
            ) : (
              <div className="space-y-2">
                {department.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      {m.profile_picture ? (
                        <img src={m.profile_picture} alt={m.full_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-violet-500">
                          {(m.first_name?.[0] || m.username?.[0] || '?').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{m.full_name}</p>
                      <p className="text-xs text-slate-500 truncate capitalize">{m.staff_title?.replace(/_/g, ' ') || m.role}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                      m.account_status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {m.account_status}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => onRemoveMember(m)}
                        className="text-slate-400 hover:text-red-500 ml-1"
                        title="Remove from department"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        {isAdmin && (
          <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700"
            >
              Edit Department
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const Departments = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.is_admin;

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [detailDept, setDetailDept] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState([]);

  // Grouped module registry for the access editor. Prefers GET /v1/modules/
  // (the backend's own table) and falls back to the built-in constant, so the
  // section always renders even if that request fails.
  const [moduleGroups, setModuleGroups] = useState(() => normalizeGroups(null));

  const [confirmArchive, setConfirmArchive] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/departments/', { params });
      setDepartments(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchEligibleUsers = useCallback(async () => {
    try {
      // NOTE: the backend uses PageNumberPagination with a fixed PAGE_SIZE of
      // 50 and no page_size_query_param, so a `page_size: 200` param is
      // silently ignored. It also has no multi-value `role` filter, so
      // `role: 'admin,staff'` matched nothing and returned every user.
      // Page through /users/ explicitly and filter to admin/staff here.
      const eligible = [];
      const seen = new Set();
      const MAX_PAGES = 40; // 40 * 50 = 2000 users; safety cap

      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const { data } = await api.get('/users/', { params: { page } });
        const batch = Array.isArray(data) ? data : data?.results || [];
        for (const u of batch) {
          if (seen.has(u.id)) continue;
          if (u.role !== 'admin' && u.role !== 'staff') continue;
          seen.add(u.id);
          eligible.push(u);
        }
        // Last page: fewer than PAGE_SIZE rows means we are done.
        if (batch.length < 50) break;
      }

      setEligibleUsers(eligible);
    } catch (err) {
      console.error('Failed to fetch eligible department members:', err);
    }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);
  useEffect(() => { if (isAdmin) fetchEligibleUsers(); }, [fetchEligibleUsers, isAdmin]);

  // Module registry is read-only metadata; a failure just leaves the local
  // fallback in place rather than blocking the page.
  useEffect(() => {
    let cancelled = false;
    api.get('/modules/')
      .then(({ data }) => {
        if (!cancelled) setModuleGroups(normalizeGroups(data?.groups));
      })
      .catch(() => { /* keep the built-in fallback */ });
    return () => { cancelled = true; };
  }, []);

  // Refresh detail drawer when departments reload
  useEffect(() => {
    if (detailDept) {
      const updated = departments.find((d) => d.id === detailDept.id);
      if (updated) setDetailDept(updated);
    }
  }, [departments]);

  const openDetail = async (dept) => {
    try {
      const { data } = await api.get(`/departments/${dept.id}/`);
      setDetailDept(data);
    } catch {
      setDetailDept(dept);
    }
  };

  const handleArchiveToggle = async (dept) => {
    try {
      await api.post(`/departments/${dept.id}/archive/`);
      toast.success(dept.is_active ? 'Department deactivated' : 'Department activated');
      fetchDepartments();
      setConfirmArchive(null);
      if (detailDept?.id === dept.id) setDetailDept(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status. Try again.');
    }
  };

  // Replaces the old blocking window.confirm() — opens the shared dialog instead.
  const handleRemoveMember = (member) => setConfirmRemove(member);

  const confirmRemoveMember = async () => {
    const member = confirmRemove;
    if (!member || !detailDept) return;
    try {
      await api.post(`/departments/${detailDept.id}/remove_member/`, { user_id: member.id });
      toast.success('Member removed from department');
      const { data } = await api.get(`/departments/${detailDept.id}/`);
      setDetailDept(data);
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member.');
    } finally {
      setConfirmRemove(null);
    }
  };

  const totalPersonnel = departments.reduce((s, d) => s + (d.member_count || 0), 0);
  const activeCount = departments.filter((d) => d.is_active).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-violet-600 tracking-[0.1em] mb-1">Organization</p>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeCount} active department{activeCount !== 1 ? 's' : ''} · {totalPersonnel} total personnel
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Department
          </button>
        )}
      </div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search" placeholder="Search by name or code…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
        <select
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      {/* Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-violet-300 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-400 mt-3 text-sm">Loading departments…</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-200 rounded-lg">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-slate-500 font-semibold">No departments found</p>
          {isAdmin && (
            <button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="mt-4 text-sm font-bold text-violet-600 hover:underline"
            >
              Create the first department
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 tracking-wider">Department</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 tracking-wider hidden sm:table-cell">Code</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 tracking-wider hidden md:table-cell">Department Head</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 tracking-wider hidden sm:table-cell">Personnel</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 tracking-wider hidden lg:table-cell">Modules</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{dept.name}</p>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                      {dept.code}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 hidden md:table-cell">
                    {dept.head_name || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-center hidden sm:table-cell">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                      {dept.member_count || 0}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center hidden lg:table-cell">
                    <ModuleCell modules={dept.modules} />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(dept.is_active)}`}>
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDetail(dept)}
                        className="text-xs font-semibold text-violet-600 hover:text-violet-800 px-2 py-1 rounded-lg hover:bg-violet-50"
                      >
                        View
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => { setEditing(dept); setModalOpen(true); }}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmArchive(dept)}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                              dept.is_active
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {dept.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Modals */}
      <DepartmentModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={fetchDepartments}
        editing={editing}
        eligibleHeads={eligibleUsers}
        moduleGroups={moduleGroups}
      />
      <AssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSave={async () => {
          fetchDepartments();
          if (detailDept) {
            const { data } = await api.get(`/departments/${detailDept.id}/`);
            setDetailDept(data);
          }
        }}
        department={detailDept}
        eligibleUsers={eligibleUsers}
      />
      {/* Detail Drawer */}
      {detailDept && (
        <DetailDrawer
          department={detailDept}
          onClose={() => setDetailDept(null)}
          onEdit={() => { setEditing(detailDept); setModalOpen(true); }}
          onAssign={() => setAssignModalOpen(true)}
          onRemoveMember={handleRemoveMember}
          isAdmin={isAdmin}
        />
      )}
      {/* Confirm archive/activate — shared ConfirmationDialog instead of a hand-rolled modal */}
      <ConfirmationDialog
        isOpen={Boolean(confirmArchive)}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => handleArchiveToggle(confirmArchive)}
        title={confirmArchive?.is_active ? 'Deactivate Department?' : 'Activate Department?'}
        message={
          confirmArchive?.is_active
            ? `"${confirmArchive.name}" will be deactivated. Personnel assignments will be preserved.`
            : `"${confirmArchive?.name}" will be reactivated.`
        }
        confirmLabel={confirmArchive?.is_active ? 'Deactivate' : 'Activate'}
        variant={confirmArchive?.is_active ? 'warning' : 'info'}
      />

      {/* Confirm remove member — replaces the old blocking window.confirm() */}
      <ConfirmationDialog
        isOpen={Boolean(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
        onConfirm={confirmRemoveMember}
        title="Remove from Department?"
        message={
          confirmRemove
            ? `${confirmRemove.full_name} will be removed from this department. Their account is not affected.`
            : ''
        }
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
};

export default Departments;
