import { useEffect, useMemo } from 'react';
import {
  peso, statusLabel, statusBadge, feeTypeName, termLabel, gradeLabel,
  formatDate, methodLabel,
} from './feeHelpers';

/**
 * Read-only drawer behind the "View" action: a student's financial picture —
 * summary tiles, every charge in the selected school year, and each charge's
 * full payment history. Recording/editing happens through the modals the
 * parent page opens (this drawer only reports the user's intent).
 */
export default function StudentDrawer({ charge, charges, student, onClose, onRecordPayment, onEdit }) {
  // Escape closes the drawer (the modals opened from it manage their own keys).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const list = useMemo(() => (charges && charges.length > 0 ? charges : (charge ? [charge] : [])), [charges, charge]);

  const summary = useMemo(() => list.reduce((acc, f) => ({
    billed: acc.billed + (Number(f.amount) || 0),
    paid: acc.paid + (Number(f.amount_paid) || 0),
  }), { billed: 0, paid: 0 }), [list]);

  const name = charge?.student_name || student?.full_name ||
    (student ? `${student.first_name} ${student.last_name}`.trim() : '') || 'Unknown student';
  const email = charge?.student_email || student?.email || '';
  const profile = student?.profile;
  const sectionLine = [profile?.classroom_name, profile?.grade_level ? gradeLabel(profile.grade_level) : '']
    .filter(Boolean).join(' · ');

  if (!charge && !student) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/30 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Financial details for ${name}`}
    >
      <aside
        className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">{name}</h2>
              <p className="text-xs text-slate-500 truncate">{email}</p>
              {sectionLine && <p className="text-xs text-violet-700 font-medium mt-0.5">{sectionLine}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close details"
              className="p-2 -m-1 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary tiles */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Billed</p>
              <p className="text-sm font-bold text-slate-900">{peso(summary.billed)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Collected</p>
              <p className="text-sm font-bold text-emerald-600">{peso(summary.paid)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Balance</p>
              <p className="text-sm font-bold text-rose-600">{peso(summary.billed - summary.paid)}</p>
            </div>
          </div>
        </div>

        {/* Charges + payments */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {list.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No charges in this school year.</p>
          ) : (
            list.map((f) => {
              const balance = Number(f.balance ?? (Number(f.amount) - Number(f.amount_paid)));
              const payments = Array.isArray(f.payments) ? f.payments : [];
              return (
                <section key={f.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Charge header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                            {feeTypeName(f)}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">{termLabel(f.term)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Due {formatDate(f.due_date)}
                          {f.description ? ` · ${f.description}` : ''}
                        </p>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold shrink-0 ${statusBadge(f.status)}`}>
                        {statusLabel(f.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Amount</p>
                        <p className="text-sm font-bold text-slate-900">{peso(f.amount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Paid</p>
                        <p className="text-sm font-bold text-emerald-600">{peso(f.amount_paid)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Balance</p>
                        <p className="text-sm font-bold text-rose-600">{peso(balance)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <button
                        onClick={() => onEdit(f)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      {balance > 0 && (
                        <button
                          onClick={() => onRecordPayment(f)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700"
                        >
                          Record Payment
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment history */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Payment history ({payments.length})
                    </p>
                    {payments.length === 0 ? (
                      <p className="text-xs text-slate-400">No payments recorded yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {payments.map((p) => (
                          <li key={p.id} className="flex items-start justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800">
                                {peso(p.amount)}
                                <span className="font-normal text-slate-500"> · {methodLabel(p.method)}</span>
                              </p>
                              <p className="text-slate-500 truncate">
                                {formatDate(p.payment_date)}
                                {p.reference_number ? ` · Ref ${p.reference_number}` : ''}
                                {p.recorded_by_name ? ` · by ${p.recorded_by_name}` : ''}
                              </p>
                              {p.notes && <p className="text-slate-400 truncate">{p.notes}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>

        {/* Footer note */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-[11px] text-slate-500">
            Payments are append-only — history stays intact when charges change.
          </p>
        </div>
      </aside>
    </div>
  );
}
