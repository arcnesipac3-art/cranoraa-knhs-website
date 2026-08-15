import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const STATUS_CONFIG = {
  pending:              { color: 'bg-amber-500',   light: 'bg-amber-50 border-amber-200',   text: 'text-amber-800',   label: 'Pending',               desc: 'Your application is awaiting review by the admissions office.',   icon: '⏳' },
  under_review:         { color: 'bg-violet-600',   light: 'bg-violet-50 border-violet-200', text: 'text-violet-800',   label: 'Under Review',           desc: 'Your application is currently being evaluated by our staff.',      icon: '🔍' },
  pending_requirements: { color: 'bg-orange-500',  light: 'bg-orange-50 border-orange-200', text: 'text-orange-800',  label: 'Pending Requirements',   desc: 'Additional documents are required. Please check the remarks.',    icon: '📋' },
  approved:             { color: 'bg-emerald-600', light: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', label: 'Approved',             desc: 'Your application has been approved. Enrollment will proceed shortly.', icon: '✅' },
  rejected:             { color: 'bg-red-600',     light: 'bg-red-50 border-red-200',       text: 'text-red-800',     label: 'Rejected',               desc: 'Your application was not approved. See remarks for details.',     icon: '❌' },
  cancelled:            { color: 'bg-gray-500',    light: 'bg-gray-50 border-gray-200',     text: 'text-gray-700',    label: 'Cancelled',              desc: 'Your application has been cancelled.',                            icon: '🚫' },
  enrolled:             { color: 'bg-violet-800',  light: 'bg-violet-50 border-violet-200', text: 'text-violet-900',  label: 'Enrolled',               desc: 'You are officially enrolled at Kiwalan National High School!',    icon: '🎓' },
  withdrawn:            { color: 'bg-orange-500',  light: 'bg-orange-50 border-orange-200', text: 'text-orange-800', label: 'Withdrawn',              desc: 'Your enrollment has been withdrawn. Contact the office for details.', icon: '🚪' },
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
  const [uploading, setUploading] = useState(false);
  const [docFiles, setDocFiles] = useState({});
  const fileRefs = useRef({});

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

  const DOC_FIELDS = [
    { key: 'birth_certificate', label: 'PSA Birth Certificate' },
    { key: 'report_card', label: 'Report Card' },
    { key: 'form_138', label: 'Form 138 / Grade 6 Certificate' },
    { key: 'certificate_of_completion', label: 'Certificate of Completion' },
    { key: 'good_moral_certificate', label: 'Good Moral Certificate' },
    { key: 'id_picture', label: 'ID Picture' },
    { key: 'last_school_attended_cert', label: 'Last School Attended Certificate' },
  ];

  const handleSubmitDocs = async () => {
    const hasFiles = Object.values(docFiles).some(f => f);
    if (!hasFiles) { toast.error('Select at least one document to upload.'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('enrollment_number', data.enrollment_number);
      Object.entries(docFiles).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });
      const res = await api.post(`/enrollment-applications/${data.id}/submit-documents/`, formData);
      toast.success(`${res.data.uploaded.length} document(s) submitted successfully!`);
      setDocFiles({});
      handleTrack(null, number);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit documents');
    } finally { setUploading(false); }
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

  const isStepCurrent = (stepIdx, stepKey) => {
    if (!data) return false;
    return stepIdx === currentIdx;
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-violet-50/30 min-h-screen py-6 sm:py-8 md:py-12 lg:py-16">
      <div className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">

        {/* Official Header */}
        <div className="bg-violet-800 text-white text-center py-5 sm:py-6 px-4 sm:px-6 rounded-t-2xl shadow-lg shadow-violet-200/50">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-violet-200">Republic of the Philippines / Department of Education</p>
          <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight mt-1">Kiwalan National High School</h1>
          <p className="text-[10px] sm:text-[11px] text-violet-200 uppercase">Iligan City, Lanao del Norte</p>
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-sm sm:text-base font-bold uppercase tracking-widest">Enrollment Application Status</p>
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-white border border-gray-200 shadow-xl shadow-gray-200/50 p-5 sm:p-6 rounded-b-2xl">
          <p className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-3 mb-5">Track Your Application</p>
          <form onSubmit={handleTrack} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Enrollment Reference Number</label>
              <input value={number} onChange={e => setNumber(e.target.value)}
                placeholder="e.g. ENR-2026-000001"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 font-mono placeholder:text-gray-400 transition-all duration-200" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address Used in Application</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 placeholder:text-gray-400 transition-all duration-200" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-violet-700 text-white text-sm font-semibold hover:bg-violet-800 disabled:opacity-50 active:scale-[0.98] transition-all duration-200 rounded-lg shadow-md shadow-violet-200">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Searching...
                </span>
              ) : 'Track My Application'}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {data && cfg && (
          <div className="mt-4 space-y-4">
            {/* Status Banner */}
            <div className={`p-5 sm:p-6 border border-gray-200 rounded-xl ${cfg.light}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-medium text-gray-500">Reference Number</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 font-mono">{data.enrollment_number}</p>
                </div>
                <span className={`px-4 py-2 text-sm font-semibold text-white rounded-lg ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>
              <p className={`text-sm sm:text-base ${cfg.text}`}>{cfg.desc}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200/60">
                <div><p className="text-xs font-medium text-gray-500">Applicant</p><p className="font-semibold text-gray-900">{data.full_name}</p></div>
                <div><p className="text-xs font-medium text-gray-500">Grade / Track</p><p className="font-semibold text-gray-900">Grade {data.grade_level}{data.strand ? ` — ${data.strand}` : ''}</p></div>
                <div><p className="text-xs font-medium text-gray-500">Date Submitted</p><p className="font-medium text-gray-800">{new Date(data.submitted_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p></div>
                {data.assigned_classroom_name && <div><p className="text-xs font-medium text-gray-500">Assigned Section</p><p className="font-semibold text-violet-700">{data.assigned_classroom_name}</p></div>}
              </div>
            </div>

            {/* Credentials (enrolled only) */}
            {data.status === 'enrolled' && (
              <div className="bg-violet-50 border border-violet-200 p-5 sm:p-6 rounded-xl">
                <p className="text-sm font-semibold text-violet-800 border-b border-violet-200 pb-2 mb-4">Student Portal Login Credentials</p>
                <div className="space-y-3">
                  {data.enrolled_student_email && (
                    <div className="bg-white border border-violet-200 p-4 rounded-xl">
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Email / Username</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900 font-mono">{data.enrolled_student_email}</p>
                    </div>
                  )}
                  {data.temp_password_display && (
                    <div className="bg-white border border-violet-200 p-4 rounded-xl">
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Temporary Password</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900 font-mono tracking-wider">{data.temp_password_display}</p>
                      <p className="text-xs text-amber-600 font-medium mt-2">Save this password. You will be required to change it upon first login.</p>
                    </div>
                  )}
                  {data.lrn && (
                    <div className="bg-white border border-violet-200 p-4 rounded-xl">
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Learner Reference Number (LRN)</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900 font-mono">{data.lrn}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white border border-gray-200 p-5 sm:p-6 rounded-xl shadow-sm">
              <p className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-3 mb-5">Application Progress</p>
              {isRejected ? (
                <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-800">Application Rejected</p>
                    <p className="text-sm text-red-700 mt-1">{data.remarks || 'Your application was not approved. Please contact the Admissions Office for more details.'}</p>
                  </div>
                </div>
              ) : (
                <div>
                  {TIMELINE_STEPS.map((tStep, i) => {
                    const isDone = isStepCompleted(i, tStep.key);
                    const isCurrent = isStepCurrent(i, tStep.key);
                    const showConnector = tStep.key !== 'pending_requirements' || isPendingReqs;
                    return (
                      <div key={tStep.key} className={`flex gap-4 ${!showConnector && !isDone ? 'opacity-40' : ''}`}>
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                            isCurrent ? 'border-2 border-violet-600 bg-violet-50' :
                            isDone ? 'bg-violet-700 shadow-md shadow-violet-200' :
                            'border-2 border-gray-200 bg-white'
                          }`}>
                            {isDone && !isCurrent && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>}
                            {isCurrent && <div className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-pulse"/>}
                          </div>
                          {i < TIMELINE_STEPS.length - 1 && showConnector && <div className={`w-0.5 h-10 rounded-full ${isDone && !isCurrent ? 'bg-violet-600' : 'bg-gray-200'}`}/>}
                        </div>
                        <div className="pb-5">
                          <p className={`text-sm font-semibold ${isDone || isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>{tStep.label}</p>
                          <p className={`text-xs sm:text-sm mt-0.5 ${isDone || isCurrent ? 'text-gray-500' : 'text-gray-300'}`}>{tStep.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Remarks */}
            {data.remarks && !isRejected && (
              <div className="bg-white border border-gray-200 p-5 sm:p-6 rounded-xl shadow-sm">
                <p className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">Remarks from Admissions Office</p>
                <p className="text-sm sm:text-base text-gray-600">{data.remarks}</p>
              </div>
            )}

            {/* Documents */}
            {data.documents && data.documents.length > 0 && (
              <div className="bg-white border border-gray-200 p-5 sm:p-6 rounded-xl shadow-sm">
                <p className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">Submitted Documents</p>
                <div className="overflow-x-auto">
                  <div className="min-w-full space-y-2">
                    {data.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-sm text-gray-700 font-medium truncate pr-3">{doc.document_type_display}</span>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 ${
                          doc.verification_status==='verified'?'bg-emerald-50 text-emerald-700 border border-emerald-200':
                          doc.verification_status==='rejected'?'bg-red-50 text-red-700 border border-red-200':
                          doc.verification_status==='missing'?'bg-amber-50 text-amber-700 border border-amber-200':
                          'bg-gray-100 text-gray-600 border border-gray-200'}`}>
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
              <div className="bg-white border border-gray-200 p-5 sm:p-6 rounded-xl shadow-sm">
                <p className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">Status History</p>
                <div className="overflow-x-auto">
                  <div className="min-w-full space-y-1">
                    {data.status_history.slice().reverse().map(h => (
                      <div key={h.id} className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
                        <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5 shrink-0"/>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{h.from_status_display || 'Submitted'} → {h.to_status_display}</p>
                          {h.notes && <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{h.notes}</p>}
                          <p className="text-[11px] text-gray-400 mt-0.5 whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Upload Additional Documents */}
            {isPendingReqs && (
              <div className="bg-white border border-orange-200 p-5 sm:p-6 rounded-xl shadow-sm">
                <p className="text-sm font-semibold text-orange-800 border-b border-orange-200 pb-2 mb-3">Upload Additional Documents</p>
                <div className="space-y-2">
                  {DOC_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="flex-1 text-sm text-gray-700 font-medium truncate">{label}</label>
                      <label className="cursor-pointer px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold rounded-lg hover:bg-orange-100 transition-all duration-200 flex-shrink-0">
                        {docFiles[key] ? docFiles[key].name.slice(0, 15) + '...' : 'Choose File'}
                        <input ref={el => fileRefs.current[key] = el} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => setDocFiles(prev => ({ ...prev, [key]: e.target.files[0] || null }))} />
                      </label>
                    </div>
                  ))}
                </div>
                <button onClick={handleSubmitDocs} disabled={uploading || !Object.values(docFiles).some(f => f)}
                  className="mt-4 w-full py-2.5 bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200">
                  {uploading ? 'Uploading...' : 'Submit Documents'}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row gap-3">
              {canCancel && (
                <button onClick={handleCancel} className="flex-1 py-2.5 sm:py-3 bg-red-600 text-white text-sm font-semibold text-center hover:bg-red-700 rounded-lg transition-all duration-200">Cancel Application</button>
              )}
              <Link to="/enroll" className="flex-1 py-2.5 sm:py-3 bg-violet-700 text-white text-sm font-semibold text-center hover:bg-violet-800 rounded-lg transition-all duration-200">New Application</Link>
              <Link to="/" className="flex-1 py-2.5 sm:py-3 border border-gray-300 bg-white text-gray-700 text-sm font-semibold text-center hover:bg-gray-50 hover:border-gray-400 rounded-lg transition-all duration-200">Return to Home</Link>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-violet-800 text-center py-4 rounded-2xl mt-4">
          <p className="text-xs text-violet-200">
            © {new Date().getFullYear()} Kiwalan National High School — Department of Education
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentTracking;
