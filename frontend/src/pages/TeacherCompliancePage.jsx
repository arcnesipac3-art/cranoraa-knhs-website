import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMyCompliance, useComplianceSubmissions } from '../hooks/useCompliance';
import ComplianceStatusBadge from '../components/compliance/ComplianceStatusBadge';
import ComplianceFileUpload from '../components/compliance/ComplianceFileUpload';
import Modal, { ModalBody, ModalFooter, ModalBtnPrimary, ModalBtnSecondary } from '../components/ui/Modal';
import toast from 'react-hot-toast';

// ── File type helpers (shared with admin) ─────────────────────────────────────
const getFileType = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'ods'].includes(ext)) return 'excel';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'ppt';
  if (['odt'].includes(ext)) return 'office';
  return 'other';
};

const FILE_TYPE_ICON = {
  image:  { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-blue-50 border-blue-100 text-blue-500' },
  pdf:    { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', color: 'bg-red-50 border-red-100 text-red-500' },
  word:   { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-blue-50 border-blue-100 text-blue-600' },
  excel:  { icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
  ppt:    { icon: 'M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z', color: 'bg-orange-50 border-orange-100 text-orange-500' },
  office: { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-slate-50 border-slate-100 text-slate-500' },
  other:  { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-slate-50 border-slate-100 text-slate-400' },
};

const FREQUENCY_ICONS = {
  weekly:    { color: 'bg-blue-50 text-blue-600 border-blue-200' },
  monthly:   { color: 'bg-violet-50 text-violet-600 border-violet-200' },
  quarterly: { color: 'bg-amber-50 text-amber-600 border-amber-200' },
  yearly:    { color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

// SVG icon per frequency (re-used from types page)
function FrequencyIcon({ frequency, className = 'w-5 h-5' }) {
  if (frequency === 'weekly') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
  if (frequency === 'monthly') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  if (frequency === 'quarterly') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

const FREQUENCY_LABELS = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const PERIOD_LABELS = {
  weekly: (n) => `Week ${n}`,
  monthly: (n) => `Month ${n}`,
  quarterly: (n) => `Term ${n}`,
  yearly: () => 'Yearly',
};

function getCurrentPeriodNumber(frequency) {
  const now = new Date();
  if (frequency === 'weekly') {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }
  if (frequency === 'monthly') return now.getMonth() + 1;
  if (frequency === 'quarterly') {
    const m = now.getMonth() + 1;
    if (m >= 6 && m <= 8) return 1;
    if (m >= 9 && m <= 11) return 2;
    return 3;
  }
  return 1;
}

function getPeriodHint(frequency) {
  const now = new Date();
  if (frequency === 'weekly') return `Week ${getCurrentPeriodNumber('weekly')}`;
  if (frequency === 'monthly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }
  if (frequency === 'quarterly') {
    const q = getCurrentPeriodNumber('quarterly');
    return `Term ${q}`;
  }
  return `SY ${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`;
}

function getDeadlineHint(type) {
  if (type.frequency === 'weekly') return 'Due every Friday';
  if (type.frequency === 'monthly') return `Due day ${type.deadline_day}`;
  if (type.frequency === 'quarterly') return 'End of term';
  return 'End of school year';
}

export default function TeacherCompliancePage() {
  const { data: myData, loading, fetchMyCompliance } = useMyCompliance();
  const { createSubmission, submitSubmission } = useComplianceSubmissions();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [expandedType, setExpandedType] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const openFilePreview = (file) => {
    const ftype = getFileType(file.original_filename);
    const previewType =
      ftype === 'image' ? 'image' :
      ftype === 'pdf' ? 'pdf' :
      ['word', 'excel', 'ppt', 'office'].includes(ftype) ? 'office' :
      'other';
    setPreviewFile({ url: file.file_url, filename: file.original_filename, type: previewType, iframeError: false });
  };

  useEffect(() => {
    fetchMyCompliance();
  }, [fetchMyCompliance]);

  const getSubmissionsForType = (typeId) => {
    return myData?.submissions?.filter(s => s.compliance_type === typeId) || [];
  };

  const getLatestSubmission = (typeId) => {
    const subs = getSubmissionsForType(typeId);
    return subs.length > 0 ? subs[0] : null;
  };

  const canSubmit = (typeId) => {
    const latest = getLatestSubmission(typeId);
    if (!latest) return true;
    if (latest.status === 'reviewed') return true;
    if (latest.status === 'rejected') return true;
    return false;
  };

  const handleOpenUpload = (type) => {
    setSelectedType(type);
    setUploadFiles([]);
    setShowUploadModal(true);
  };

  const handleSubmitUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('compliance_type', selectedType.id);
      if (myData?.academic_year) formData.append('academic_year', myData.academic_year.id);
      if (myData?.semester) formData.append('semester', myData.semester.id);
      formData.append('period_number', getCurrentPeriodNumber(selectedType.frequency));
      uploadFiles.forEach(file => formData.append('files', file));

      const submission = await createSubmission(formData);
      await submitSubmission(submission.id);
      setShowUploadModal(false);
      fetchMyCompliance();
    } catch (err) {
      // handled by hook
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-bottom-safe max-w-[1200px] mx-auto min-h-0 bg-slate-50 px-4 py-4 md:px-6 md:py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-200 rounded w-32" />
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-40" />
                  <div className="h-3 bg-slate-100 rounded w-56" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-bottom-safe max-w-[1200px] mx-auto min-h-0 bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">My Compliance</h1>
        {myData?.academic_year && (
          <p className="text-sm text-slate-500 mt-0.5">
            SY {myData.academic_year.name}
            {myData.semester && ` \u2022 ${myData.semester.semester_type}`}
          </p>
        )}
      </div>

      {/* Warning */}
      {(!myData?.academic_year || !myData?.semester) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-700">No active academic year or semester. Please contact the admin.</p>
        </div>
      )}

      {/* Type Cards */}
      <div className="space-y-4">
        {myData?.types?.map((type, i) => {
          const typeSubmissions = getSubmissionsForType(type.id);
          const latest = typeSubmissions[0] || null;
          const submitAllowed = canSubmit(type.id);
          const isExpanded = expandedType === type.id;
          const freq = FREQUENCY_ICONS[type.frequency] || FREQUENCY_ICONS.weekly;
          const reviewedCount = typeSubmissions.filter(s => s.status === 'reviewed').length;

          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-violet-200 transition-colors"
            >
              {/* Card Header */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${freq.color}`}>
                        <FrequencyIcon frequency={type.frequency} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900">{type.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{FREQUENCY_LABELS[type.frequency]}</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs text-slate-400">{getDeadlineHint(type)}</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs font-bold text-violet-500">{getPeriodHint(type.frequency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {latest && (
                      <div className="hidden md:flex items-center gap-1.5 mr-1">
                        <ComplianceStatusBadge status={latest.status} size="xs" />
                        {latest.file_count > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {latest.file_count} file{latest.file_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {!latest && (
                      <span className="hidden md:inline text-[11px] font-bold text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full mr-1">
                        Not yet submitted
                      </span>
                    )}

                    {submitAllowed ? (
                      <button
                        onClick={() => handleOpenUpload(type)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {latest?.status === 'rejected' ? 'Resubmit' : latest ? 'Submit New' : 'Submit'}
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-400 text-sm font-bold rounded-lg cursor-not-allowed">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pending Review
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress dots */}
                {typeSubmissions.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-3">
                    {typeSubmissions.slice(0, 5).map((sub, j) => (
                      <div
                        key={sub.id}
                        className={`w-2 h-2 rounded-full ${
                          sub.status === 'reviewed' ? 'bg-emerald-400' :
                          sub.status === 'submitted' ? 'bg-blue-400' :
                          sub.status === 'rejected' ? 'bg-red-400' :
                          sub.status === 'overdue' ? 'bg-amber-400' :
                          'bg-slate-200'
                        }`}
                        title={`${PERIOD_LABELS[type.frequency](sub.period_number)}: ${sub.status}`}
                      />
                    ))}
                    {typeSubmissions.length > 5 && (
                      <span className="text-[10px] text-slate-400 ml-1">
                        +{typeSubmissions.length - 5}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {reviewedCount}/{typeSubmissions.length} reviewed
                    </span>
                  </div>
                )}
              </div>

              {/* Submission History (Expandable) */}
              {typeSubmissions.length > 0 && (
                <>
                  <button
                    onClick={() => setExpandedType(isExpanded ? null : type.id)}
                    className="w-full px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-between border-t border-slate-100"
                  >
                    <span>{typeSubmissions.length} submission{typeSubmissions.length !== 1 ? 's' : ''}</span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="divide-y divide-slate-50 border-t border-slate-100">
                          {typeSubmissions.map(sub => (
                            <div key={sub.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                              {/* Row top: period, status, date, resubmit */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-sm font-bold text-slate-700 w-20 shrink-0">
                                    {PERIOD_LABELS[type.frequency](sub.period_number)}
                                  </span>
                                  <ComplianceStatusBadge status={sub.status} size="xs" />
                                  {sub.file_count > 0 && (
                                    <span className="text-[11px] text-slate-400 shrink-0">
                                      {sub.file_count} file{sub.file_count !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {sub.submitted_at && (
                                    <span className="text-[10px] text-slate-300 hidden sm:block">
                                      {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                  {sub.status === 'rejected' && (
                                    <button
                                      onClick={() => handleOpenUpload(type)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-600 text-white text-[11px] font-bold rounded-lg hover:bg-violet-700 transition-colors"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                      </svg>
                                      Resubmit
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Rejection remark */}
                              {sub.remarks && sub.status === 'rejected' && (
                                <div className="mt-2 flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                                  <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <p className="text-xs text-red-700 leading-relaxed">{sub.remarks}</p>
                                </div>
                              )}

                              {/* File list with preview */}
                              {sub.files && sub.files.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {sub.files.map(file => {
                                    const ftype = getFileType(file.original_filename);
                                    const icon = FILE_TYPE_ICON[ftype] || FILE_TYPE_ICON.other;
                                    return (
                                      <button
                                        key={file.id}
                                        onClick={() => openFilePreview(file)}
                                        title={file.original_filename}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 transition-colors ${icon.color}`}
                                      >
                                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon.icon} />
                                        </svg>
                                        <span className="max-w-[120px] truncate">{file.original_filename}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          );
        })}

        {myData?.types?.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-violet-100">
              <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">No compliance types assigned</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">Contact your admin to set up compliance requirements for your account.</p>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <Modal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          title={previewFile.filename}
          subtitle={
            previewFile.type === 'image' ? 'Image Preview' :
            previewFile.type === 'pdf' ? 'PDF Preview' :
            previewFile.type === 'office' ? 'Document Preview' : 'File'
          }
          size="xl"
        >
          <div className="space-y-3">
            {previewFile.type === 'image' && (
              <div className="flex items-center justify-center bg-slate-100 rounded-xl overflow-hidden min-h-[24rem]">
                <img
                  src={previewFile.url}
                  alt={previewFile.filename}
                  className="max-w-full max-h-[32rem] object-contain"
                  onError={() => setPreviewFile(prev => ({ ...prev, iframeError: true }))}
                />
              </div>
            )}

            {previewFile.type === 'pdf' && !previewFile.iframeError && (
              <div className="h-[32rem] w-full rounded-xl overflow-hidden border border-slate-200">
                <iframe
                  src={previewFile.url}
                  title={previewFile.filename}
                  className="w-full h-full border-0"
                  onError={() => setPreviewFile(prev => ({ ...prev, iframeError: true }))}
                />
              </div>
            )}

            {previewFile.type === 'office' && !previewFile.iframeError && (
              <div className="space-y-2">
                <div className="h-[32rem] w-full rounded-xl overflow-hidden border border-slate-200 relative">
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-0">
                    <div className="text-center space-y-2">
                      <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-slate-400">Loading preview…</p>
                    </div>
                  </div>
                  <iframe
                    key={previewFile.url}
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url)}&embedded=true`}
                    title={previewFile.filename}
                    className="w-full h-full border-0 relative z-10"
                    onError={() => setPreviewFile(prev => ({ ...prev, iframeError: true }))}
                  />
                </div>
                <p className="text-xs text-slate-400 text-center">
                  If the preview is blank,{' '}
                  <button
                    onClick={() => setPreviewFile(prev => ({ ...prev, iframeError: true }))}
                    className="text-violet-600 font-bold hover:underline"
                  >
                    click here
                  </button>
                  {' '}to download instead.
                </p>
              </div>
            )}

            {(previewFile.iframeError || previewFile.type === 'other') && (
              <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200 py-16 space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700 mb-1">{previewFile.filename}</p>
                  <p className="text-xs text-slate-400">
                    {previewFile.iframeError
                      ? 'Preview unavailable — the file may be restricted or the viewer timed out.'
                      : 'This file type cannot be previewed in the browser.'}
                  </p>
                </div>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download File
                </a>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <a
                href={previewFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-violet-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in new tab
              </a>
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={`Submit ${selectedType?.name || ''}`}
        subtitle={selectedType ? PERIOD_LABELS[selectedType.frequency](getCurrentPeriodNumber(selectedType.frequency)) : ''}
        size="md"
      >
        <ModalBody>
          <ComplianceFileUpload
            files={uploadFiles}
            onFilesChange={setUploadFiles}
            maxFiles={10}
            maxSizeMB={selectedType?.max_file_size_mb || 50}
          />
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setShowUploadModal(false)}>
            Cancel
          </ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleSubmitUpload} loading={uploading} disabled={uploadFiles.length === 0}>
            Upload & Submit
          </ModalBtnPrimary>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
}
