import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMyCompliance, useComplianceSubmissions } from '../hooks/useCompliance';
import ComplianceStatusBadge from '../components/compliance/ComplianceStatusBadge';
import ComplianceFileUpload from '../components/compliance/ComplianceFileUpload';
import Modal, { ModalBody, ModalFooter, ModalBtnPrimary, ModalBtnSecondary } from '../components/ui/Modal';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ── helpers ────────────────────────────────────────────────────────────────────
const getFileType = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'ods'].includes(ext)) return 'excel';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'ppt';
  return 'other';
};

const FILE_TYPE_ICON = {
  image:  { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-blue-50 border-blue-100 text-blue-500' },
  pdf:    { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', color: 'bg-red-50 border-red-100 text-red-500' },
  word:   { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-blue-50 border-blue-100 text-blue-600' },
  excel:  { icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
  ppt:    { icon: 'M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z', color: 'bg-orange-50 border-orange-100 text-orange-500' },
  other:  { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-slate-50 border-slate-100 text-slate-400' },
};

const FREQ_COLORS = {
  weekly:    'bg-blue-50 text-blue-600 border-blue-200',
  monthly:   'bg-violet-50 text-violet-600 border-violet-200',
  quarterly: 'bg-amber-50 text-amber-600 border-amber-200',
  yearly:    'bg-emerald-50 text-emerald-600 border-emerald-200',
};

const FREQ_LABELS = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

function getPeriodHint(frequency) {
  const now = new Date();
  if (frequency === 'weekly') {
    // School-year-relative week: June 1 = Week 1
    const schoolYearStart = new Date(now.getFullYear(), 5, 1); // June 1
    if (now < schoolYearStart) schoolYearStart.setFullYear(now.getFullYear() - 1);
    const diffDays = Math.floor((now - schoolYearStart) / 86400000);
    const week = Math.floor(diffDays / 7) + 1;
    return `Week ${week}`;
  }
  if (frequency === 'monthly') {
    return now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }
  if (frequency === 'quarterly') {
    const m = now.getMonth() + 1;
    const q = m >= 6 && m <= 8 ? 1 : m >= 9 && m <= 11 ? 2 : 3;
    return `Term ${q}`;
  }
  return `SY ${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`;
}

// ── SubjectIcon ────────────────────────────────────────────────────────────────
function SubjectIcon({ name, code }) {
  const colors = [
    'bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
  ];
  const idx = (code?.charCodeAt(0) || 0) % colors.length;
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${colors[idx]}`}>
      {(code || name || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── ComplianceTypeRow ──────────────────────────────────────────────────────────
function ComplianceTypeRow({ ctype, assignmentId, academicYearId, semesterId, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

  const latest = ctype.latest_submission;
  const canSubmit = ctype.can_submit;
  const freqColor = FREQ_COLORS[ctype.frequency] || FREQ_COLORS.weekly;

  const handleUpload = async () => {
    if (!uploadFiles.length) { toast.error('Select at least one file'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('compliance_type', ctype.id);
      formData.append('classroom_subject', assignmentId);
      formData.append('period_number', ctype.current_period);
      if (academicYearId) formData.append('academic_year', academicYearId);
      if (semesterId) formData.append('semester', semesterId);
      uploadFiles.forEach(f => formData.append('files', f));

      const res = await api.post('/compliance/submissions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.post(`/compliance/submissions/${res.data.id}/submit/`);
      toast.success('Submitted for review');
      setShowUpload(false);
      setUploadFiles([]);
      onRefresh();
    } catch (err) {
      const msg = err.response?.data?.classroom_subject?.[0]
        || err.response?.data?.error
        || err.response?.data?.detail
        || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      {/* Row header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${freqColor}`}>
            {FREQ_LABELS[ctype.frequency]}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{ctype.name}</p>
            <p className="text-[10px] text-violet-500 font-bold">{getPeriodHint(ctype.frequency)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {latest
            ? <ComplianceStatusBadge status={latest.status} size="xs" />
            : <span className="text-[10px] font-bold text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Not submitted</span>
          }
          {canSubmit ? (
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-[11px] font-bold rounded-lg hover:bg-violet-700 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {latest?.status === 'rejected' ? 'Resubmit' : 'Submit'}
            </button>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">Pending Review</span>
          )}
          {ctype.submissions?.length > 0 && (
            <button onClick={() => setExpanded(p => !p)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Rejection remark */}
      {latest?.status === 'rejected' && latest?.remarks && (
        <div className="mx-4 mb-2 p-2.5 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
          <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-red-700">{latest.remarks}</p>
        </div>
      )}

      {/* File chips for latest */}
      {latest?.files?.length > 0 && !expanded && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {latest.files.map(file => {
            const ft = getFileType(file.original_filename);
            const ic = FILE_TYPE_ICON[ft] || FILE_TYPE_ICON.other;
            return (
              <button key={file.id} onClick={() => setPreviewFile(file)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium text-slate-600 hover:border-violet-200 hover:bg-violet-50 transition-colors ${ic.color}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={ic.icon} />
                </svg>
                <span className="max-w-[120px] truncate">{file.original_filename}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Submission history */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100">
            {ctype.submissions.map(sub => (
              <div key={sub.id} className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">P{sub.period_number}</span>
                    <ComplianceStatusBadge status={sub.status} size="xs" />
                    {sub.file_count > 0 && <span className="text-[10px] text-slate-400">{sub.file_count} file{sub.file_count !== 1 ? 's' : ''}</span>}
                  </div>
                  {sub.submitted_at && (
                    <span className="text-[10px] text-slate-300">
                      {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                {sub.files?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {sub.files.map(file => {
                      const ft = getFileType(file.original_filename);
                      const ic = FILE_TYPE_ICON[ft] || FILE_TYPE_ICON.other;
                      return (
                        <button key={file.id} onClick={() => setPreviewFile(file)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] hover:border-violet-200 hover:bg-violet-50 transition-colors ${ic.color}`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={ic.icon} />
                          </svg>
                          <span className="max-w-[100px] truncate">{file.original_filename}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload modal */}
      <Modal isOpen={showUpload} onClose={() => { setShowUpload(false); setUploadFiles([]); }}
        title={`Submit ${ctype.name}`} subtitle={getPeriodHint(ctype.frequency)} size="md">
        <ModalBody>
          <ComplianceFileUpload files={uploadFiles} onFilesChange={setUploadFiles} maxFiles={10} maxSizeMB={ctype.max_file_size_mb || 50} />
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => { setShowUpload(false); setUploadFiles([]); }}>Cancel</ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleUpload} loading={uploading} disabled={!uploadFiles.length}>Upload & Submit</ModalBtnPrimary>
        </ModalFooter>
      </Modal>

      {/* File preview modal */}
      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}

// ── FilePreviewModal ───────────────────────────────────────────────────────────
function FilePreviewModal({ file, onClose }) {
  const ftype = getFileType(file.original_filename);
  const previewType = ftype === 'image' ? 'image' : ftype === 'pdf' ? 'pdf'
    : ['word', 'excel', 'ppt'].includes(ftype) ? 'office' : 'other';
  const [iframeError, setIframeError] = useState(false);

  return (
    <Modal isOpen={true} onClose={onClose} title={file.original_filename} size="xl">
      <div className="space-y-3">
        {previewType === 'image' && (
          <div className="flex items-center justify-center bg-slate-100 rounded-xl min-h-[24rem]">
            <img src={file.file_url} alt={file.original_filename} className="max-w-full max-h-[32rem] object-contain" />
          </div>
        )}
        {previewType === 'pdf' && !iframeError && (
          <div className="h-[32rem] w-full rounded-xl overflow-hidden border border-slate-200">
            <iframe src={file.file_url} title={file.original_filename} className="w-full h-full border-0" onError={() => setIframeError(true)} />
          </div>
        )}
        {previewType === 'office' && !iframeError && (
          <div className="h-[32rem] w-full rounded-xl overflow-hidden border border-slate-200">
            <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(file.file_url)}&embedded=true`}
              title={file.original_filename} className="w-full h-full border-0" onError={() => setIframeError(true)} />
          </div>
        )}
        {(iframeError || previewType === 'other') && (
          <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200 py-16 space-y-4">
            <p className="text-sm font-bold text-slate-700">{file.original_filename}</p>
            <a href={file.file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">
              Download File
            </a>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <a href={file.file_url} target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold text-slate-500 hover:text-violet-600 transition-colors">
            Open in new tab
          </a>
          <button onClick={onClose} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700">Close</button>
        </div>
      </div>
    </Modal>
  );
}

// ── SubjectAssignmentCard ──────────────────────────────────────────────────────
function SubjectAssignmentCard({ assignment, academicYearId, semesterId, onRefresh }) {
  const [collapsed, setCollapsed] = useState(false);
  const compliantCount = assignment.compliant_count;
  const totalCount = assignment.total_count;
  const rate = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;
  const isFullyCompliant = compliantCount === totalCount && totalCount > 0;
  const hasOverdue = assignment.compliance_types.some(t => t.latest_submission?.status === 'overdue');

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-colors ${
      isFullyCompliant ? 'border-emerald-200' : hasOverdue ? 'border-red-200' : 'border-slate-200'
    }`}>
      {/* Card header */}
      <div className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setCollapsed(p => !p)}>
        <div className="flex items-center gap-3 min-w-0">
          <SubjectIcon name={assignment.subject_name} code={assignment.subject_code} />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">{assignment.subject_name}</h3>
            <p className="text-[11px] text-slate-500 truncate">{assignment.classroom_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Compliance rate pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            isFullyCompliant ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : hasOverdue ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isFullyCompliant
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              }
            </svg>
            {compliantCount}/{totalCount} submitted
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Compliance types list */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-slate-100 divide-y divide-slate-50 px-4 pb-2 pt-1 space-y-2">
              {assignment.compliance_types.map(ctype => (
                <ComplianceTypeRow
                  key={ctype.id}
                  ctype={ctype}
                  assignmentId={assignment.id}
                  academicYearId={academicYearId}
                  semesterId={semesterId}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TeacherCompliancePage() {
  const { data: myData, loading, fetchMyCompliance } = useMyCompliance();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchMyCompliance(); }, [fetchMyCompliance]);

  const summary = myData?.summary;
  const assignments = myData?.assignments || [];

  const filteredAssignments = searchQuery
    ? assignments.filter(a =>
        a.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.classroom_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assignments;

  if (loading) {
    return (
      <div className="page-bottom-safe max-w-[1200px] mx-auto px-4 py-6 md:px-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}
          </div>
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="page-bottom-safe max-w-[1200px] mx-auto px-4 py-4 md:px-6 md:py-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">My Compliance</h1>
          {myData?.academic_year && (
            <p className="text-sm text-slate-500 mt-0.5">
              SY {myData.academic_year.name}
              {myData.semester && ` · ${myData.semester.semester_type}`}
            </p>
          )}
        </div>
        <button onClick={fetchMyCompliance}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Warning: no academic year */}
      {!myData?.academic_year && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-700">No active academic year or semester. Please contact admin.</p>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Required', value: summary.total, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
            { label: 'Submitted', value: summary.submitted, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Pending', value: summary.pending, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Overdue', value: summary.overdue, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Overall rate bar */}
      {summary?.total > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Overall Compliance Rate</span>
            <span className={`text-sm font-extrabold ${summary.rate >= 80 ? 'text-emerald-700' : summary.rate >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
              {summary.rate}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${
              summary.rate >= 80 ? 'bg-emerald-500' : summary.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`} style={{ width: `${summary.rate}%` }} />
          </div>
        </div>
      )}

      {/* Search */}
      {assignments.length > 1 && (
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by subject or classroom..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
        </div>
      )}

      {/* Subject assignment cards */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-violet-100">
              <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {searchQuery ? 'No matching assignments' : 'No subject assignments found'}
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              {searchQuery ? 'Try a different search term.' : 'You have no subject assignments for this academic year. Contact admin if this is incorrect.'}
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment, i) => (
            <motion.div key={assignment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <SubjectAssignmentCard
                assignment={assignment}
                academicYearId={myData?.academic_year?.id}
                semesterId={myData?.semester?.id}
                onRefresh={fetchMyCompliance}
              />
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
