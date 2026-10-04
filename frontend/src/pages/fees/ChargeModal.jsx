import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../utils/api';
import { studentName, gradeLabel, peso, TERMS } from './feeHelpers';

const EMPTY_FORM = {
  student: '',
  fee_type: '',
  term: '',
  amount: '',
  due_date: '',
  description: '',
};

/**
 * Create/edit a student charge (what the school owes).
 *
 * Amount Paid and Status are intentionally NOT inputs: they are derived
 * from recorded payments on the backend (FeeSerializer marks them
 * read-only), so money can only be added through the Record Payment flow.
 */
export default function ChargeModal({ isOpen, onClose, onSave, editing, students, feeTypes, academicYearId }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editing) {
      setForm({
        student: editing.student ?? '',
        fee_type: editing.fee_type ?? '',
        term: editing.term ?? '',
        amount: editing.amount ?? '',
        due_date: editing.due_date ? String(editing.due_date).slice(0, 10) : '',
        description: editing.description || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [editing, isOpen]);

  if (!isOpen) return null;

  const activeTypes = feeTypes.filter((t) => t.is_active || String(t.id) === String(form.fee_type));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        student: form.student,
        fee_type: form.fee_type,
        term: form.term === '' ? null : Number(form.term),
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        description: form.description,
      };
      if (editing) {
        await api.patch(`/fees/${editing.id}/`, payload);
        toast.success('Charge updated');
      } else {
        // Land new charges in the school year selected in the page header.
        const createPayload = { ...payload };
        if (academicYearId) createPayload.academic_year = academicYearId;
        await api.post('/fees/', createPayload);
        toast.success('Charge created');
      }
      onSave();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.student) setError(`Student: ${data.student[0]}`);
      else if (data?.amount) setError(`Amount: ${data.amount[0]}`);
      else if (data?.due_date) setError(`Due date: ${data.due_date[0]}`);
      else if (data?.fee_type) setError(`Fee type: ${data.fee_type[0]}`);
      else if (data?.term) setError(`Term: ${data.term[0]}`);
      else if (data?.academic_year) setError(`School year: ${data.academic_year[0]}`);
      else if (data?.error) setError(data.error);
      else setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const paymentCount = editing?.payments?.length || 0;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="charge-modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="charge-modal-title" className="text-lg font-bold text-slate-900">
              {editing ? 'Edit Charge' : 'Add Charge'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editing
                ? 'Payments are recorded from the View drawer.'
                : 'A charge is what the student owes; payments are recorded separately.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {editing && paymentCount > 0 && (
            <div className="bg-violet-50 border border-violet-200 text-violet-800 text-xs px-4 py-2 rounded-lg">
              {peso(editing.amount_paid)} collected so far via {paymentCount} payment
              {paymentCount === 1 ? '' : 's'} — amount paid is derived from payment history and cannot be edited here.
            </div>
          )}

          <div>
            <label htmlFor="charge-student" className="block text-xs font-semibold text-slate-700 mb-1">Student *</label>
            <select
              id="charge-student"
              required value={form.student}
              onChange={(e) => setForm({ ...form, student: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">— Select Student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {studentName(s)}
                  {s.profile?.grade_level ? ` · ${gradeLabel(s.profile.grade_level)}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="charge-type" className="block text-xs font-semibold text-slate-700 mb-1">Fee Type *</label>
              <select
                id="charge-type"
                required value={form.fee_type}
                onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">— Select Type —</option>
                {activeTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {feeTypes.filter((t) => t.is_active).length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  No active fee types. Add one under the Fee Types tab.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="charge-term" className="block text-xs font-semibold text-slate-700 mb-1">Term</label>
              <select
                id="charge-term"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="charge-amount" className="block text-xs font-semibold text-slate-700 mb-1">Amount *</label>
              <input
                id="charge-amount"
                type="number" step="0.01" min="0.01" required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="charge-due" className="block text-xs font-semibold text-slate-700 mb-1">Due Date *</label>
              <input
                id="charge-due"
                type="date" required
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="charge-description" className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              id="charge-description"
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
            <button
              type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
