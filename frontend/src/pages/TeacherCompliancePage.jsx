import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useMyCompliance, useComplianceTypes, useComplianceSubmissions } from '../hooks/useCompliance';
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

export default function TeacherCompliancePage() {
  const { data: myData, loading, fetchMyCompliance } = useMyCompliance();
  const { createSubmission, submitSubmission } = useComplianceSubmissions();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMyCompliance();
  }, [fetchMyCompliance]);

  const handleOpenUpload = (type, period) => {
    setSelectedType(type);
    setSelectedPeriod(period);
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
      formData.append('period_number', selectedPeriod);

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

  const getSubmissionsForType = (typeId) => {
    return myData?.submissions?.filter(s => s.compliance_type === typeId) || [];
  };

  const getCurrentSubmission = (typeId) => {
    return myData?.submissions?.find(
      s => s.compliance_type === typeId && s.status in ('draft', 'rejected')
    );
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
              {myData.semester && ` • ${myData.semester.semester_type}`}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {myData?.types?.map(type => {
          const typeSubmissions = getSubmissionsForType(type.id);
          const currentSub = typeSubmissions.find(s => s.status === 'draft' || s.status === 'rejected');
          const latestReviewed = typeSubmissions.find(s => s.status === 'reviewed');

          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{FREQUENCY_ICONS[type.frequency] || '📋'}</span>
                  <div>
                    <h3 className="font-bold text-slate-900">{type.name}</h3>
                    <p className="text-xs text-slate-400">
                      {FREQUENCY_LABELS[type.frequency]} • Due: {type.frequency === 'weekly' ? 'Every Friday' : `Day ${type.deadline_day}`}
                    </p>
                  </div>
                </div>
                {currentSub && (
                  <button
                    onClick={() => handleOpenUpload(type, currentSub.period_number)}
                    className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    {currentSub.status === 'rejected' ? 'Resubmit' : 'Upload Files'}
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-50">
                {typeSubmissions.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-slate-400">
                    No submissions yet
                  </div>
                ) : (
                  typeSubmissions.map(sub => (
                    <div key={sub.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-600 w-24">
                          {type.frequency === 'weekly' ? `Week ${sub.period_number}` :
                           type.frequency === 'monthly' ? `Month ${sub.period_number}` :
                           type.frequency === 'quarterly' ? `Term ${sub.period_number}` :
                           `Period ${sub.period_number}`}
                        </span>
                        <ComplianceStatusBadge status={sub.status} />
                        {sub.file_count > 0 && (
                          <span className="text-xs text-slate-400">
                            {sub.file_count} file{sub.file_count !== 1 ? 's' : ''}
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
                            onClick={() => handleOpenUpload(type, sub.period_number)}
                            className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                          >
                            Edit & Resubmit
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={`Upload ${selectedType?.name || ''}`}
        subtitle={selectedPeriod ? `Period ${selectedPeriod}` : ''}
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
