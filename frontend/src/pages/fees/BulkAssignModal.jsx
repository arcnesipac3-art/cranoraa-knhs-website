import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../utils/api';
import { studentName, gradeLabel, peso, TERMS } from './feeHelpers';

const EMPTY_BULK_FORM = {
  fee_type: '',
  term: '',
  amount: '',
  due_date: '',
  description: '',
};

/**
 * Assign one charge definition to many students in a single request.
 * Backend dedupes on (student, fee_type, due_date) and validates the shared
 * fields once, so re-running the same assignment never double-bills.
 */
export default function BulkAssignModal({ isOpen, onClose, onSaved, students, fees, feeTypes, academicYearId }) {
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
    if (!form.due_date || !form.fee_type) return set;
    fees.forEach((f) => {
      if (f && String(f.fee_type) === String(form.fee_type) && f.due_date &&
          String(f.due_date).slice(0, 10) === form.due_date && f.student) {
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

  const activeTypes = feeTypes.filter((t) => t.is_active || String(t.id) === String(form.fee_type));
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
      const payload = {
        student_ids: Array.from(selected),
        fee_type: form.fee_type,
        amount: parseFloat(form.amount),
        term: form.term === '' ? null : Number(form.term),
        due_date: form.due_date,
        description: form.description,
      };
      if (academicYearId) payload.academic_year = academicYearId;
      const res = await api.post('/fees/bulk-create/', payload);
      const created = res.data?.created ?? 0;
      const skipped = res.data?.skipped ?? 0;
      if (created > 0) toast.success(`Charge assigned to ${created} student${created === 1 ? '' : 's'}`);
      else toast('No new charges were created');
      if (skipped > 0) toast(`${skipped} student${skipped === 1 ? '' : 's'} already had this charge and were skipped`);
      onSaved();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.error) setError(data.error);
      else if (data && typeof data === 'object') {
        const key = Object.keys(data)[0];
        const val = data[key];
        setError(Array.isArray(val) ? `${key}: ${val[0]}` : 'Failed to assign charges. Please try again.');
      } else setError('Failed to assign charges. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const amountNum = parseFloat(form.amount) || 0;
  const total = amountNum * selected.size;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="bulk-modal-title" className="text-lg font-bold text-slate-900">Bulk Assign Charge</h2>
            <p className="text-xs text-slate-500 mt-0.5">Define the charge once, then pick every student it applies to.</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          {/* Charge details — defined once for every selected student */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bulk-type" className="block text-xs font-semibold text-slate-700 mb-1">Fee Type *</label>
              <select
                id="bulk-type"
                required value={form.fee_type}
                onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">— Select Type —</option>
                {activeTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bulk-amount" className="block text-xs font-semibold text-slate-700 mb-1">Amount *</label>
              <input
                id="bulk-amount"
                type="number" step="0.01" min="0.01" required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bulk-due" className="block text-xs font-semibold text-slate-700 mb-1">Due Date *</label>
              <input
                id="bulk-due"
                type="date" required
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="bulk-term" className="block text-xs font-semibold text-slate-700 mb-1">Term</label>
              <select
                id="bulk-term"
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">No term set</option>
                {TERMS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="bulk-description" className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              id="bulk-description"
              rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              placeholder="Optional description applied to every selected student..."
            />
          </div>

          {/* Student picker */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="bulk-search" className="block text-xs font-semibold text-slate-700">Students *</label>
              <span className="text-xs font-semibold text-violet-700">{selected.size} selected</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <input
                id="bulk-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, or ID..."
                className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <select
                aria-label="Filter students by grade"
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
                  <span className="font-semibold text-violet-700">{peso(total)}</span>
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
