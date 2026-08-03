import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMyCompliance, useComplianceSubmissions } from '../hooks/useCompliance';
import ComplianceStatusBadge from '../components/compliance/ComplianceStatusBadge';
import ComplianceFileUpload from '../components/compliance/ComplianceFileUpload';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const FREQUENCY_ICONS = {
  weekly: '📋',
  monthly: '📅',
  quarterly: '📊',
  yearly: '📆',
};

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
  if (frequency === 'weekly') return `Current: Week ${getCurrentPeriodNumber('weekly')}`;
  if (frequency === 'monthly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `Current: ${months[now.getMonth()]} (${now.getFullYear()})`;
  }
  if (frequency === 'quarterly') {
    const q = getCurrentPeriodNumber('quarterly');
    return `Current: Term ${q} (SY ${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)})`;
  }
  return `Current: SY ${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`;
}

export default function TeacherCompliancePage() {
  const { data: myData, loading, fetchMyCompliance } = useMyCompliance();
  const { createSubmission, submitSubmission } = useComplianceSubmissions();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [expandedType, setExpandedType] = useState(null);

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

  const getSubmitLabel = (typeId, frequency) => {
    const latest = getLatestSubmission(typeId);
    const periodNum = getCurrentPeriodNumber(frequency);
    if (!latest) return `Submit ${PERIOD_LABELS[frequency](periodNum)}`;
    if (latest.status === 'reviewed') return `Submit ${PERIOD_LABELS[frequency](periodNum)}`;
    if (latest.status === 'rejected') return `Resubmit ${PERIOD_LABELS[frequency](periodNum)}`;
    return '';
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

      uploadFiles.forEach(file => {
        formData.append('files', file);
      });

      const submission = await createSubmission(formData);
      await submitSubmission(submission.id);

      setShowUploadModal(false);
      fetchMyCompliance();
    } catch (err) {
      // error handled by hook
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
            <div key={i} className="bg-white rounded-xl p-6 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-40" />
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
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
      className="page-bottom-safe max-w-[1200px] mx-auto min-h-0 bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">My Compliance</h1>
          {myData?.academic_year && (
            <p className="text-sm text-slate-500 mt-1">
              SY {myData.academic_year.name}
              {myData.semester && ` \u2022 ${myData.semester.semester_type}`}
            </p>
          )}
        </div>
      </div>

      {(!myData?.academic_year || !myData?.semester) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          No active academic year or semester. Please contact the admin.
        </div>
      )}

      <div className="space-y-4">
        {myData?.types?.map(type => {
          const typeSubmissions = getSubmissionsForType(type.id);
          const latest = typeSubmissions[0] || null;
          const submitAllowed = canSubmit(type.id);
          const currentPeriod = getCurrentPeriodNumber(type.frequency);
          const isExpanded = expandedType === type.id;

          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{FREQUENCY_ICONS[type.frequency] || '📋'}</span>
                    <div>
                      <h3 className="font-bold text-slate-900">{type.name}</h3>
                      <p className="text-xs text-slate-400">
                        {FREQUENCY_LABELS[type.frequency]} \u2022 Due: {type.frequency === 'weekly' ? 'Every Friday' : `Day ${type.deadline_day}`}
                        {' \u2022 '}
                        <span className="text-violet-500 font-medium">{getPeriodHint(type.frequency)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {latest && (
                      <div className="hidden md:flex items-center gap-2 mr-2">
                        <span className="text-xs text-slate-400">Latest:</span>
                        <ComplianceStatusBadge status={latest.status} size="xs" />
                        {latest.file_count > 0 && (
                          <span className="text-[10px] text-slate-400">
                            ({latest.file_count} file{latest.file_count !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    )}

                    {submitAllowed ? (
                      <button
                        onClick={() => handleOpenUpload(type)}
                        className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
                      >
                        {latest?.status === 'rejected' ? 'Resubmit' : 'Submit'}
                      </button>
                    ) : (
                      <div className="px-4 py-2 bg-slate-100 text-slate-400 text-sm font-medium rounded-lg cursor-not-allowed">
                        Pending Review
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {typeSubmissions.length > 0 && (
                <>
                  <button
                    onClick={() => setExpandedType(isExpanded ? null : type.id)}
                    className="w-full px-5 py-2 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <span>
                      {typeSubmissions.length} submission{typeSubmissions.length !== 1 ? 's' : ''}
                    </span>
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                            <div key={sub.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-slate-600 w-28">
                                  {PERIOD_LABELS[type.frequency](sub.period_number)}
                                </span>
                                <ComplianceStatusBadge status={sub.status} size="xs" />
                                {sub.file_count > 0 && (
                                  <span className="text-xs text-slate-400">
                                    {sub.file_count} file{sub.file_count !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {sub.submitted_at && (
                                  <span className="text-[10px] text-slate-300">
                                    {new Date(sub.submitted_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                {sub.remarks && sub.status === 'rejected' && (
                                  <span className="text-xs text-red-500 max-w-[200px] truncate" title={sub.remarks}>
                                    {sub.remarks}
                                  </span>
                                )}
                                {sub.status === 'rejected' && (
                                  <button
                                    onClick={() => handleOpenUpload(type)}
                                    className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                                  >
                                    Resubmit
                                  </button>
                                )}
                              </div>
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
      </div>

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={`Submit ${selectedType?.name || ''}`}
        subtitle={selectedType ? `${PERIOD_LABELS[selectedType.frequency](getCurrentPeriodNumber(selectedType.frequency))}` : ''}
        size="md"
      >
        <div className="p-5 space-y-4">
          <ComplianceFileUpload
            files={uploadFiles}
            onFilesChange={setUploadFiles}
            maxFiles={10}
            maxSizeMB={selectedType?.max_file_size_mb || 50}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitUpload}
              disabled={uploading || uploadFiles.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload & Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
