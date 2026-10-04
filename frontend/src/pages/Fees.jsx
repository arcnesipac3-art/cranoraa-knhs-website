import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'partial':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'unpaid':
    default:
      return 'bg-rose-100 text-rose-700 border-rose-200';
  }
};

const feeTypeLabel = (type) => {
  if (!type) return 'Unknown';
  const labels = {
    tuition: 'Tuition Fee',
    miscellaneous: 'Miscellaneous Fee',
    books: 'Books/Materials',
    uniform: 'Uniform',
    other: 'Other',
  };
  return labels[type] || type;
};

const studentName = (s) => s.full_name || `${s.first_name} ${s.last_name}`.trim() || s.username;

const gradeLabel = (g) => (/^\d+$/.test(String(g)) ? `Grade ${g}` : String(g));

// The /users/ endpoint pages 50 at a time (PageNumberPagination with a fixed
// PAGE_SIZE and no page_size_query_param), so a `limit` param is silently
// ignored — page through explicitly like Departments.jsx does. Admin accounts
// also get every approved user back for `?role=student`, so keep only real
// students client-side.
async function fetchAllStudents() {
  const all = [];
  const seen = new Set();
  const MAX_PAGES = 40; // 40 x 50 = 2000 users; safety cap
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await api.get('/users/', { params: { role: 'student', page } });
    const batch = Array.isArray(data) ? data : data?.results || [];
    for (const u of batch) {
      if (!u || u.role !== 'student' || seen.has(u.id)) continue;
      seen.add(u.id);
      all.push(u);
    }
    if (Array.isArray(data) || !data?.next || batch.length === 0) break;
  }
  return all.sort((a, b) => studentName(a).localeCompare(studentName(b)));
}

const EMPTY_FORM = {
  student: '',
  fee_type: 'tuition',
  amount: '',
  amount_paid: 0,
  status: 'unpaid',
  due_date: '',
  description: '',
};

// ── Fee Form Modal ────────────────────────────────────────────────────────────
function FeeModal({ isOpen, onClose, onSave, editing, students }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editing) {
      setForm({
        student: editing.student || '',
        fee_type: editing.fee_type || 'tuition',
        amount: editing.amount || '',
        amount_paid: editing.amount_paid || 0,
        status: editing.status || 'unpaid',
        due_date: editing.due_date ? editing.due_date.split('T')[0] : '',
        description: editing.description || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [editing, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        student: form.student,
        fee_type: form.fee_type,
        amount: parseFloat(form.amount),
        amount_paid: parseFloat(form.amount_paid) || 0,
        status: form.status,
        due_date: form.due_date,
        description: form.description,
      };
      if (editing) {
        await api.patch(`/fees/${editing.id}/`, payload);
        toast.success('Fee updated');
      } else {
        await api.post('/fees/', payload);
        toast.success('Fee created');
      }
      onSave();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.student) setError(`Student: ${data.student[0]}`);
      else if (data?.amount) setError(`Amount: ${data.amount[0]}`);
      else if (data?.due_date) setError(`Due date: ${data.due_date[0]}`);
      else if (data?.fee_type) setError(`Fee type: ${data.fee_type[0]}`);
      else if (data?.error) setError(data.error);
      else setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {editing ? 'Edit Fee' : 'Create Fee'}
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Student *</label>
            <select
              required value={form.student}
              onChange={(e) => setForm({ ...form, student: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">— Select Student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {studentName(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Type *</label>
              <select
                required value={form.fee_type}
                onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="tuition">Tuition Fee</option>
                <option value="miscellaneous">Miscellaneous Fee</option>
                <option value="books">Books/Materials</option>
                <option value="uniform">Uniform</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status *</label>
              <select
                required value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partially Paid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount *</label>
              <input
                type="number" step="0.01" min="0" required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid</label>
              <input
                type="number" step="0.01" min="0"
                value={form.amount_paid}
                onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date *</label>
            <input
              type="date" required
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              placeholder="Optional description..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">
              {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Bulk Assign Modal ────────────────────────────────────────────────────────
const EMPTY_BULK_FORM = {
  fee_type: 'tuition',
  amount: '',
  due_date: '',
  description: '',
};

function BulkAssignModal({ isOpen, onClose, onSaved, students, fees }) {
  const [form, setForm] = useState(EMPTY_BULK_FORM);
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_BULK_FORM);
      setSelected(new Set());
      setQuery('');
      setGrade('');
      setError('');
      setSaving(false);
    }
  }, [isOpen]);

  // Students that already carry this exact fee (same type + due date) — the
  // backend skips them anyway; showing it here keeps the selected count honest.
  const billed = useMemo(() => {
    const set = new Set();
    if (!form.due_date) return set;
    fees.forEach((f) => {
      if (f && f.fee_type === form.fee_type && f.due_date &&
          f.due_date.slice(0, 10) === form.due_date && f.student) {
        set.add(f.student);
      }
    });
    return set;
  }, [fees, form.fee_type, form.due_date]);

  useEffect(() => {
    if (billed.size === 0) return;
    setSelected((prev) => {
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        if (billed.has(id)) changed = true;
        else next.add(id);
      });
      return changed ? next : prev;
    });
  }, [billed]);

  const grades = useMemo(() => {
    const set = new Set(students.map((s) => s.profile?.grade_level).filter(Boolean));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [students]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (grade && s.profile?.grade_level !== grade) return false;
      if (!q) return true;
      return studentName(s).toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.username || '').toLowerCase().includes(q);
    });
  }, [students, query, grade]);

  if (!isOpen) return null;

  const selectable = visible.filter((s) => !billed.has(s.id));
  const allShownSelected = selectable.length > 0 && selectable.every((s) => selected.has(s.id));

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllShown = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShownSelected) selectable.forEach((s) => next.delete(s.id));
      else selectable.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.size === 0 || saving) return;
    setError('');
    setSaving(true);
    try {
      const res = await api.post('/fees/bulk-create/', {
        student_ids: Array.from(selected),
        fee_type: form.fee_type,
        amount: parseFloat(form.amount),
        amount_paid: 0,
        status: 'unpaid',
        due_date: form.due_date,
        description: form.description,
      });
      const created = res.data?.created ?? 0;
      const skipped = res.data?.skipped ?? 0;
      if (created > 0) toast.success(`Fee assigned to ${created} student${created === 1 ? '' : 's'}`);
      else toast('No new fees were created');
      if (skipped > 0) toast(`${skipped} student${skipped === 1 ? '' : 's'} already had this fee and were skipped`);
      onSaved();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.error) setError(data.error);
      else if (data && typeof data === 'object') {
        const key = Object.keys(data)[0];
        const val = data[key];
        setError(Array.isArray(val) ? `${key}: ${val[0]}` : 'Failed to assign fees. Please try again.');
      } else setError('Failed to assign fees. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const amountNum = parseFloat(form.amount) || 0;
  const total = amountNum * selected.size;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bulk Assign Fee</h2>
            <p className="text-xs text-slate-500 mt-0.5">Define the fee once, then pick every student it applies to.</p>
          </div>
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

          {/* Fee details — defined once for every selected student */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Type *</label>
              <select
                required value={form.fee_type}
                onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="tuition">Tuition Fee</option>
                <option value="miscellaneous">Miscellaneous Fee</option>
                <option value="books">Books/Materials</option>
                <option value="uniform">Uniform</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount *</label>
              <input
                type="number" step="0.01" min="0" required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date *</label>
            <input
              type="date" required
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              placeholder="Optional description applied to every selected student..."
            />
          </div>

          {/* Student picker */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700">Students *</label>
              <span className="text-xs font-semibold text-violet-700">{selected.size} selected</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, or ID..."
                className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">All grade levels</option>
                {grades.map((g) => (
                  <option key={g} value={g}>{gradeLabel(g)}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 px-3 py-2 mb-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={allShownSelected}
                onChange={toggleAllShown}
                disabled={selectable.length === 0}
                className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              Select all shown ({selectable.length})
            </label>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {visible.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500 text-center">No students match your search.</p>
              ) : (
                visible.map((s) => {
                  const already = billed.has(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 px-3 py-2 ${already ? 'bg-slate-50 opacity-70' : 'hover:bg-violet-50 cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        disabled={already}
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-slate-900 truncate">{studentName(s)}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {[s.profile?.classroom_name,
                            s.profile?.grade_level ? gradeLabel(s.profile.grade_level) : '',
                            s.email || ''].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      {already && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Already billed</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              {selected.size > 0 ? (
                <>
                  <span className="font-semibold text-slate-900">{selected.size}</span>
                  {' '}student{selected.size === 1 ? '' : 's'} · Total{' '}
                  <span className="font-semibold text-violet-700">
                    ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </>
              ) : (
                'Select at least one student.'
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || selected.size === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {saving
                  ? 'Assigning...'
                  : selected.size === 0
                    ? 'Select students'
                    : `Assign to ${selected.size} student${selected.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation ──────────────────────────────────────────────────────
function DeleteConfirm({ isOpen, onClose, onConfirm, fee }) {
  if (!fee) return null;
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Fee"
      message={`Are you sure you want to delete the ${feeTypeLabel(fee.fee_type)} for ${fee.student_name || 'this student'}? This action cannot be undone.`}
      confirmText="Delete"
      variant="danger"
    />
  );
}

// ── Main Fees Page ───────────────────────────────────────────────────────────
export default function Fees() {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editingFee, setEditingFee] = useState(null);
  const [deletingFee, setDeletingFee] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [feesRes, studentList] = await Promise.all([
        api.get('/fees/'),
        fetchAllStudents(),
      ]);
      // Sanitize: remove null/undefined objects AND objects missing required fields
      const cleanFees = (feesRes.data || []).filter(f =>
        f &&
        typeof f === 'object' &&
        f.fee_type != null &&
        f.status != null &&
        f.amount != null
      );
      setFees(cleanFees);
      setStudents(studentList);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

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
      toast.success('Fee deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete fee');
    }
    setDeletingFee(null);
  };

  // Filters
  const filteredFees = fees.filter((f) => {
    if (!f) return false; // defensive: skip null/undefined items
    const matchesSearch = !search ||
      (f.student_name && f.student_name.toLowerCase().includes(search.toLowerCase())) ||
      (f.student_email && f.student_email.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || f.status === statusFilter;
    const matchesType = !typeFilter || f.fee_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: fees.length,
    unpaid: fees.filter(f => f.status === 'unpaid').length,
    partial: fees.filter(f => f.status === 'partial').length,
    paid: fees.filter(f => f.status === 'paid').length,
    totalAmount: fees.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0),
    totalPaid: fees.reduce((sum, f) => sum + parseFloat(f.amount_paid || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fee Management</h1>
          <p className="text-slate-500 mt-1">Manage student fees, payments, and balances</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulk(true)}
            className="px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Bulk Assign
          </button>
          <button
            onClick={() => { setEditingFee(null); setShowCreate(true); }}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Fee
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fees</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Unpaid</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{stats.unpaid}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Partial</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.partial}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Paid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.paid}</p>
        </div>
      </div>

      {/* Amount Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Billed</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₱{stats.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₱{stats.totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Outstanding</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">₱{(stats.totalAmount - stats.totalPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name, email..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="tuition">Tuition Fee</option>
              <option value="miscellaneous">Miscellaneous</option>
              <option value="books">Books/Materials</option>
              <option value="uniform">Uniform</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fees Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {filteredFees.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-900">No fees found</h3>
            <p className="mt-1 text-slate-500">Try adjusting your filters or create a new fee.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
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
                        {feeTypeLabel(fee.fee_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      ₱{parseFloat(fee.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      ₱{parseFloat(fee.amount_paid || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      ₱{parseFloat(fee.balance || fee.amount - fee.amount_paid || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(fee.status)}`}>
                        {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-PH') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingFee(fee)}
                          className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletingFee(fee)}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        )}
      </div>

      {/* Modals */}
      <FeeModal
        isOpen={showCreate || !!editingFee}
        onClose={() => { setShowCreate(false); setEditingFee(null); }}
        onSave={handleSave}
        editing={editingFee}
        students={students}
      />
      <BulkAssignModal
        isOpen={showBulk}
        onClose={() => setShowBulk(false)}
        onSaved={handleSave}
        students={students}
        fees={fees}
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
