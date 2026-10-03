import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { PageHero } from '../components/public';

const STATUS_CONFIG = {
  pending:              { color: 'bg-amber-500',   light: 'bg-amber-50 border-amber-300',   text: 'text-amber-800',   label: 'Pending',               desc: 'Your application is awaiting review by the admissions office.',   icon: '⏳' },
  under_review:         { color: 'bg-violet-600',    light: 'bg-violet-50 border-violet-300',     text: 'text-blue-800',    label: 'Under Review',           desc: 'Your application is currently being evaluated by our staff.',      icon: '🔍' },
  pending_requirements: { color: 'bg-orange-500',  light: 'bg-orange-50 border-orange-300', text: 'text-orange-800',  label: 'Pending Requirements',   desc: 'Additional documents are required. Please check the remarks.',    icon: '📋' },
  approved:             { color: 'bg-green-600',   light: 'bg-green-50 border-green-300',   text: 'text-green-800',   label: 'Approved',               desc: 'Your application has been approved. Enrollment will proceed shortly.', icon: '✅' },
  rejected:             { color: 'bg-red-600',     light: 'bg-red-50 border-red-300',       text: 'text-red-800',     label: 'Rejected',               desc: 'Your application was not approved. See remarks for details.',     icon: '❌' },
  cancelled:            { color: 'bg-slate-500',   light: 'bg-slate-50 border-slate-300',   text: 'text-slate-700',   label: 'Cancelled',              desc: 'Your application has been cancelled.',                            icon: '🚫' },
  enrolled:             { color: 'bg-violet-700',  light: 'bg-slate-50 border-violet-300', text: 'text-slate-900',  label: 'Enrolled',               desc: 'You are officially enrolled at Kiwalan National High School!',    icon: '🎓' },
  withdrawn:            { color: 'bg-orange-500',  light: 'bg-orange-50 border-orange-300', text: 'text-orange-800', label: 'Withdrawn',              desc: 'Your enrollment has been withdrawn. Contact the office for details.', icon: '🚪' },
};

const TIMELINE_STEPS = [
  { key: 'pending',               label: 'Application Submitted', desc: 'Received by admissions office' },
  { key: 'under_review',          label: 'Under Review',          desc: 'Documents being evaluated' },
  { key: 'pending_requirements',  label: 'Additional Documents',  desc: 'Missing documents requested' },
  { key: 'approved',              label: 'Application Approved',  desc: 'Application accepted' },
  { key: 'enrolled',              label: 'Officially Enrolled',   desc: 'Student account created' },
];

const EnrollmentTracking = () => {
  const [searchParams] = useSearchParams();
  const [number, setNumber] = useState(searchParams.get('number') || '');
  const [email, setEmail] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const n = searchParams.get('number');
    if (n) { setNumber(n); handleTrack(null, n); }
  }, []);

  const handleTrack = async (e, autoNumber) => {
    if (e) e.preventDefault();
    const num = autoNumber || number;
    if (!num && !email) { setError('Please enter an enrollment number or email address.'); return; }
    setLoading(true); setError(''); setData(null);
    try {
      const params = new URLSearchParams();
      if (num) params.set('number', num);
      else params.set('email', email);
      const res = await api.get(`/enrollment-applications/track/?${params}`);
      setData(res.data);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 404) setError(msg || 'No application found. Please verify your enrollment number or email address.');
      else if (err.response?.status === 429) setError('Too many requests. Please wait a moment and try again.');
      else if (err.response?.status >= 500) setError(msg || 'A server error occurred. Please try again later or contact the admissions office.');
      else if (!err.response) setError('Network error. Please check your connection and try again.');
      else setError(msg || 'Unable to retrieve application. Please try again later or contact the admissions office.');
    } finally { setLoading(false); }
  };

  const cfg = data ? STATUS_CONFIG[data.status] : null;
  const currentIdx = data ? TIMELINE_STEPS.findIndex(s => s.key === data.status) : -1;
  const isRejected = data?.status === 'rejected';
  const isPendingReqs = data?.status === 'pending_requirements';
  const canCancel = data && ['pending', 'under_review', 'pending_requirements'].includes(data.status);

  const handleCancel = async () => {
    const { value } = await Swal.fire({
      title: 'Cancel Application?',
      input: 'textarea', inputLabel: 'Reason (optional)',
      inputPlaceholder: 'Reason for cancelling...',
      showCancelButton: true, confirmButtonText: 'Yes, Cancel',
      confirmButtonColor: '#EF4444',
    });
    if (value === undefined) return;
    try {
      await api.post(`/enrollment-applications/${data.id}/cancel/`, { remarks: value || 'Cancelled by applicant' });
      toast.success('Application cancelled');
      handleTrack(null, number);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const isStepCompleted = (stepIdx, stepKey) => {
    if (!data) return false;
    // pending_requirements is a branch — only completed if we came from it or are past it
    if (stepKey === 'pending_requirements') {
      return isPendingReqs || currentIdx > stepIdx;
    }
    // For steps before pending_requirements (index 2), completed if status is at or past them
    // For steps after pending_requirements, completed only if status is approved or enrolled
    if (stepIdx < 2) return currentIdx >= stepIdx || isPendingReqs || currentIdx >= 2;
    if (stepIdx >= 3) return currentIdx >= 3;
    return stepIdx <= currentIdx;
  };

  const isStepCurrent = (stepIdx) => {
    if (!data) return false;
    return stepIdx === currentIdx;
  };

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Enrollment' }, { label: 'Track application' }]}
        kicker="Enrollment services"
        title="Track your enrollment application"
        lead="Enter your enrollment reference number or the email address you used on your application to view its current status."
      />
      <div className="py-10 md:py-14">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <div className="public-card overflow-hidden">

        {/* Search Form */}
        <div className="p-4 sm:p-6">
          <p className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-2 mb-4">Track your application</p>
          <form onSubmit={handleTrack} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 tracking-[0.1em] mb-1.5">Enrollment reference number</label>
              <input value={number} onChange={e => setNumber(e.target.value)}
                placeholder="e.g. ENR-2026-000001"
                className="w-full px-3 py-2.5 border border-slate-300 rounded text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-violet-600 font-mono placeholder:text-slate-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-[11px] text-slate-400 font-semibold tracking-[0.1em]">or</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 tracking-[0.1em] mb-1.5">Email address used in application</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2.5 border border-slate-300 rounded text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-violet-600 placeholder:text-slate-400" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full public-btn-primary py-3 disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Searching...
                </span>
              ) : 'Track my application'}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 flex items-start gap-3">
              <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}
        </div>

        {data && cfg && (
          <div className="border-t border-slate-200">
            {/* Status Banner */}
            <div className={`border-b border-slate-200 p-4 sm:p-5 ${cfg.light}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">Reference number</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 font-mono">{data.enrollment_number}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-white ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>
              <p className={`text-sm sm:text-base font-medium ${cfg.text}`}>{cfg.desc}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200 text-sm">
                <div><p className="text-[11px] font-semibold text-slate-500">Applicant</p><p className="font-semibold text-slate-900">{data.full_name}</p></div>
                <div><p className="text-[11px] font-semibold text-slate-500">Grade / track</p><p className="font-semibold text-slate-900">Grade {data.grade_level}{data.strand ? ` — ${data.strand}` : ''}</p></div>
                <div><p className="text-[11px] font-semibold text-slate-500">Date submitted</p><p className="font-medium text-slate-700">{new Date(data.submitted_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p></div>
                {data.assigned_classroom_name && <div><p className="text-[11px] font-semibold text-slate-500">Assigned section</p><p className="font-semibold text-violet-800">{data.assigned_classroom_name}</p></div>}
              </div>
            </div>

            {/* Credentials (enrolled only) */}
            {data.status === 'enrolled' && (
              <div className="border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
                <p className="text-xs font-semibold text-violet-800 border-b border-violet-200 pb-2 mb-4">Student portal login credentials</p>
                <div className="space-y-3">
                  {data.enrolled_student_email && (
                    <div className="bg-white border border-violet-200 rounded p-3 sm:p-4">
                      <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Email / username</p>
                      <p className="text-sm sm:text-base font-semibold text-slate-900 font-mono">{data.enrolled_student_email}</p>
                    </div>
                  )}
                  {data.temp_password_display && (
                    <div className="bg-white border border-violet-200 rounded p-3 sm:p-4">
                      <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Temporary password</p>
                      <p className="text-sm sm:text-base font-semibold text-slate-900 font-mono tracking-wider">{data.temp_password_display}</p>
                      <p className="text-[11px] text-amber-700 font-medium mt-1.5">⚠ Save this password. You will be required to change it upon first login.</p>
                    </div>
                  )}
                  {data.lrn && (
                    <div className="bg-white border border-violet-200 rounded p-3 sm:p-4">
                      <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Learner reference number (LRN)</p>
                      <p className="text-sm sm:text-base font-semibold text-slate-900 font-mono">{data.lrn}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <p className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-2 mb-5">Application progress</p>
              {isRejected ? (
                <div className="flex items-start gap-3 sm:gap-4 p-4 bg-red-50 border border-red-200 rounded">
                  <div className="h-9 w-9 flex items-center justify-center flex-shrink-0 rounded-lg border border-red-200 bg-white text-red-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 18L18 6M6 6l12 12"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-800">Application rejected</p>
                    <p className="text-xs sm:text-sm text-red-700 mt-1">{data.remarks || 'Your application was not approved. Please contact the Admissions Office for more details.'}</p>
                  </div>
                </div>
              ) : (
                <div>
                  {TIMELINE_STEPS.map((tStep, i) => {
                    const isDone = isStepCompleted(i, tStep.key);
                    const isCurrent = isStepCurrent(i);
                    const showConnector = tStep.key !== 'pending_requirements' || isPendingReqs;
                    return (
                      <div key={tStep.key} className={`flex gap-3 sm:gap-4 ${!showConnector && !isDone ? 'opacity-40' : ''}`}>
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 border flex items-center justify-center flex-shrink-0 rounded ${isCurrent ? 'border-violet-700 bg-violet-50' : isDone ? 'border-violet-700 bg-violet-700' : 'border-slate-300 bg-white'}`}>
                            {isDone && !isCurrent && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>}
                            {isCurrent && <div className="w-2.5 h-2.5 rounded-full bg-violet-700 animate-pulse"/>}
                          </div>
                          {i < TIMELINE_STEPS.length - 1 && showConnector && <div className={`w-0.5 h-10 ${isDone && !isCurrent ? 'bg-violet-700' : 'bg-slate-200'}`}/>}
                        </div>
                        <div className="pb-4 sm:pb-5">
                          <p className={`text-sm font-semibold ${isDone || isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>{tStep.label}</p>
                          <p className={`text-xs sm:text-sm mt-0.5 ${isDone || isCurrent ? 'text-slate-600' : 'text-slate-400'}`}>{tStep.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Remarks */}
            {data.remarks && !isRejected && (
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <p className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-2 mb-3">Remarks from Admissions Office</p>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{data.remarks}</p>
              </div>
            )}

            {/* Documents */}
            {data.documents && data.documents.length > 0 && (
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <p className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-2 mb-3">Submitted documents</p>
                <div className="overflow-x-auto">
                  <div className="min-w-full space-y-1.5">
                    {data.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-200 rounded">
                        <span className="text-sm text-slate-700 font-medium truncate pr-3">{doc.document_type_display}</span>
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded border flex-shrink-0 ${
                          doc.verification_status==='verified'?'bg-emerald-50 text-emerald-700 border-emerald-200':
                          doc.verification_status==='rejected'?'bg-red-50 text-red-700 border-red-200':
                          doc.verification_status==='missing'?'bg-amber-50 text-amber-700 border-amber-200':
                          'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {doc.verification_status_display}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Status History */}
            {data.status_history && data.status_history.length > 0 && (
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <p className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-2 mb-3">Status history</p>
                <div className="overflow-x-auto">
                  <div className="min-w-full space-y-1">
                    {data.status_history.slice().reverse().map(h => (
                      <div key={h.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                        <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0"/>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-medium text-slate-800 truncate">{h.from_status_display || 'Submitted'} → {h.to_status_display}</p>
                          {h.notes && <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">{h.notes}</p>}
                          <p className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-slate-50 p-4 flex flex-col sm:flex-row gap-3">
              {canCancel && (
                <button onClick={handleCancel} className="flex-1 py-2.5 sm:py-3 bg-red-600 text-white text-sm font-semibold text-center hover:bg-red-700 transition-colors rounded-lg">Cancel application</button>
              )}
              <Link to="/enroll" className="flex-1 public-btn-primary py-2.5 sm:py-3">New application</Link>
              <Link to="/" className="flex-1 public-btn-secondary py-2.5 sm:py-3">Return to home</Link>
            </div>
          </div>
        )}

          </div>

          {/* Footer */}
          <div className="mt-6 border-t border-slate-200 pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Kiwalan National High School — Department of Education
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentTracking;
