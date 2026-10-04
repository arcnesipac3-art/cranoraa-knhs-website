import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../utils/api';
import {
  peso, statusLabel, statusBadge, feeTypeName, todayISO, PAYMENT_METHODS,
} from './feeHelpers';

const EMPTY_FORM = {
  amount: '',
  payment_date: '',
  method: 'cash',
  reference_number: '',
  notes: '',
};

/**
 * Record one payment against a charge.
 *
 * The client caps the amount at the remaining balance for instant feedback,
 * but the backend is authoritative (400 when the amount exceeds the balance),
 * so this is a UX guard, not a security boundary.
 */
export default function RecordPaymentModal({ charge, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (charge) {
      setForm({ ...EMPTY_FORM, payment_date: todayISO() });
      setError('');
      setSaving(false);
    }
  }, [charge]);

  if (!charge) return null;

  const balance = Number(charge.balance ?? (Number(charge.amount) - Number(charge.amount_paid)));
  const amountNum = parseFloat(form.amount);
  const overCap = form.amount !== '' && !Number.isNaN(amountNum) && amountNum > balance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a payment amount greater than zero.');
      return;
    }
    if (amountNum > balance) {
      setError(`Payment cannot exceed the remaining balance of ${peso(balance)}.`);
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/fees/${charge.id}/payments/`, {
        amount: amountNum,
        payment_date: form.payment_date,
        method: form.method,
        reference_number: form.reference_number,
        notes: form.notes,
      });
      const newBalance = res.data?.charge?.balance;
      toast.success(`Payment recorded — new balance ${peso(newBalance)}`);
      onSaved();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.amount) setError(Array.isArray(data.amount) ? data.amount[0] : String(data.amount));
      else if (data?.payment_date) setError(`Payment date: ${Array.isArray(data.payment_date) ? data.payment_date[0] : data.payment_date}`);
      else if (data?.error) setError(data.error);
      else setError('Failed to record payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="payment-modal-title" className="text-lg font-bold text-slate-900">Record Payment</h2>
            <p className="text-xs text-slate-500 mt-0.5">Adds to the payment history of this charge.</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Charge context */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{charge.student_name || 'Unknown student'}</p>
                <p className="text-xs text-slate-500 truncate">{charge.student_email || ''}</p>
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold shrink-0 ${statusBadge(charge.status)}`}>
                {statusLabel(charge.status)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Amount</p>
                <p className="text-sm font-bold text-slate-900">{peso(charge.amount)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Paid</p>
                <p className="text-sm font-bold text-emerald-600">{peso(charge.amount_paid)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Balance</p>
                <p className="text-sm font-bold text-rose-600">{peso(balance)}</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              {feeTypeName(charge)} charge · due {charge.due_date ? new Date(String(charge.due_date).slice(0, 10)).toLocaleDateString('en-PH') : '—'}
            </p>
          </div>

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pay-amount" className="block text-xs font-semibold text-slate-700 mb-1">Amount *</label>
              <input
                id="pay-amount"
                type="number" step="0.01" min="0.01" max={balance}
                required value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${overCap ? 'border-red-400 focus:ring-red-300' : 'border-slate-300 focus:ring-violet-500'}`}
                placeholder="0.00"
                aria-describedby="pay-balance-hint"
              />
              <p id="pay-balance-hint" className={`text-[11px] mt-1 ${overCap ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                {overCap
                  ? `Cannot exceed ${peso(balance)}`
                  : `Remaining balance: ${peso(balance)}`}
              </p>
            </div>
            <div>
              <label htmlFor="pay-date" className="block text-xs font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input
                id="pay-date"
                type="date" required
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pay-method" className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
            <select
              id="pay-method"
              required value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pay-reference" className="block text-xs font-semibold text-slate-700 mb-1">Reference Number</label>
            <input
              id="pay-reference"
              type="text" maxLength={50}
              value={form.reference_number}
              onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Official receipt / reference (optional)"
            />
          </div>

          <div>
            <label htmlFor="pay-notes" className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              id="pay-notes"
              rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit" disabled={saving || overCap}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
