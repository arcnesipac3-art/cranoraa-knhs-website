import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useComplianceSubmissions } from '../../hooks/useCompliance';
import { useFetch } from '../../hooks/useFetch';
import ComplianceStatusBadge from '../../components/compliance/ComplianceStatusBadge';
import Modal, { ModalBody, ModalFooter, ModalField, modalTextareaCls, ModalBtnPrimary, ModalBtnSecondary } from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status', color: 'bg-slate-100 text-slate-600' },
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'reviewed', label: 'Reviewed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'overdue', label: 'Overdue', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'draft', label: 'Draft', color: 'bg-slate-50 text-slate-600 border-slate-200' },
];

const FREQUENCY_ICONS = {
  weekly: '📋',
  monthly: '📅',
  quarterly: '📊',
  yearly: '📆',
};

export default function ComplianceSubmissionsPage() {
  const [filters, setFilters] = useState({ status: '', compliance_type_id: '', teacher_id: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'reviewed', remarks: '' });
  const [reviewing, setReviewing] = useState(false);

  const { submissions, loading, fetchSubmissions, reviewSubmission, bulkReview } = useComplianceSubmissions(filters);
  const { data: types } = useFetch('/compliance/types/');
  const { data: usersData } = useFetch('/users/', { params: { role: 'staff', page_size: 200 } });

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions, filters]);

  const teachers = usersData?.results || usersData || [];
  const typesList = types?.results || types || [];

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === submissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(submissions.map(s => s.id));
    }
  };

  const handleOpenReview = (submission) => {
    setReviewingSubmission(submission);
    setReviewForm({ status: 'reviewed', remarks: '' });
    setShowReviewModal(true);
  };

  const handleReview = async () => {
    if (reviewForm.status === 'rejected' && !reviewForm.remarks.trim()) {
      toast.error('Remarks are required when rejecting');
      return;
    }
    setReviewing(true);
    try {
      await reviewSubmission(reviewingSubmission.id, reviewForm);
      setShowReviewModal(false);
      setSelectedIds(prev => prev.filter(id => id !== reviewingSubmission.id));
      fetchSubmissions();
    } catch (err) {
      // handled by hook
    } finally {
      setReviewing(false);
    }
  };

  const handleBulkReview = async (status) => {
    if (selectedIds.length === 0) {
      toast.error('Select submissions first');
      return;
    }
    const result = await Swal.fire({
      title: `${status === 'reviewed' ? 'Approve' : 'Reject'} ${selectedIds.length} submission(s)?`,
      input: status === 'rejected' ? 'text' : undefined,
      inputPlaceholder: status === 'rejected' ? 'Remarks (required)' : undefined,
      inputValidator: status === 'rejected' ? (value) => !value && 'Remarks are required' : undefined,
      showCancelButton: true,
      confirmButtonColor: status === 'reviewed' ? '#10B981' : '#EF4444',
      confirmButtonText: status === 'reviewed' ? 'Approve All' : 'Reject All',
    });
    if (result.isConfirmed) {
      await bulkReview(selectedIds, { status, remarks: result.value || `Bulk ${status} by admin` });
      setSelectedIds([]);
    }
  };

  const formatPeriod = (sub) => {
    const freq = sub.compliance_type_frequency;
    if (freq === 'weekly') return `Week ${sub.period_number}`;
    if (freq === 'monthly') return `Month ${sub.period_number}`;
    if (freq === 'quarterly') return `Term ${sub.period_number}`;
    return `Period ${sub.period_number}`;
  };

  const hasActiveFilters = filters.status || filters.compliance_type_id || filters.teacher_id;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Submissions</h2>
          <p className="text-sm text-slate-500 mt-0.5">{submissions.length} total submission{submissions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider">Filter</span>
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-400"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={filters.compliance_type_id}
            onChange={(e) => setFilters(prev => ({ ...prev, compliance_type_id: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-400"
          >
            <option value="">All Types</option>
            {typesList.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={filters.teacher_id}
            onChange={(e) => setFilters(prev => ({ ...prev, teacher_id: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-400"
          >
            <option value="">All Teachers</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => setFilters({ status: '', compliance_type_id: '', teacher_id: '' })}
              className="text-xs font-bold text-violet-600 hover:text-violet-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-3 flex items-center gap-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{selectedIds.length}</span>
            </div>
            <span className="text-sm font-bold text-violet-800">
              {selectedIds.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkReview('reviewed')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Approve All
            </button>
            <button
              onClick={() => handleBulkReview('rejected')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject All
            </button>
          </div>
          <button
            onClick={() => setSelectedIds([])}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 ml-auto"
          >
            Clear
          </button>
        </motion.div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse flex items-center gap-4">
              <div className="h-4 w-4 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-4 bg-slate-200 rounded w-20" />
            </div>
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">No submissions found</h3>
          <p className="text-sm text-slate-500">
            {hasActiveFilters ? 'Try adjusting your filters.' : 'Submissions will appear here once teachers submit.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
            <input
              type="checkbox"
              checked={submissions.length > 0 && selectedIds.length === submissions.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">Teacher</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Type</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Period</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Files</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Status</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 text-right">Action</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {submissions.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className={`px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors ${
                  selectedIds.includes(sub.id) ? 'bg-violet-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(sub.id)}
                  onChange={() => toggleSelect(sub.id)}
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{sub.teacher_name}</p>
                </div>

                <div className="w-32 flex items-center gap-1.5">
                  <span className="text-sm">{FREQUENCY_ICONS[sub.compliance_type_frequency] || '📋'}</span>
                  <span className="text-sm text-slate-600 truncate">{sub.compliance_type_name}</span>
                </div>

                <div className="w-24 text-sm text-slate-600">{formatPeriod(sub)}</div>

                <div className="w-16 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                    {sub.file_count}
                  </span>
                </div>

                <div className="w-24">
                  <ComplianceStatusBadge status={sub.status} size="xs" />
                </div>

                <div className="w-20 text-right">
                  <button
                    onClick={() => handleOpenReview(sub)}
                    className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    Review
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`Review: ${reviewingSubmission?.teacher_name || ''}`}
        subtitle={reviewingSubmission ? `${reviewingSubmission.compliance_type_name} \u2022 ${formatPeriod(reviewingSubmission)}` : ''}
        size="lg"
      >
        {reviewingSubmission && (
          <>
            <ModalBody>
              <div className="space-y-5">
                {/* Files */}
                {reviewingSubmission.file_count > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Submitted Files</h4>
                    <div className="space-y-2">
                      {reviewingSubmission.files?.map(file => (
                        <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="w-9 h-9 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                            <span className="text-lg">📄</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{file.original_filename}</p>
                            <p className="text-xs text-slate-400">{(file.file_size_bytes / 1024).toFixed(1)} KB</p>
                          </div>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-600 hover:bg-violet-50 hover:border-violet-200 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous rejection */}
                {reviewingSubmission.remarks && reviewingSubmission.status === 'rejected' && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Previous Rejection</p>
                    <p className="text-sm text-red-700">{reviewingSubmission.remarks}</p>
                  </div>
                )}

                {/* Decision */}
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Decision</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setReviewForm(prev => ({ ...prev, status: 'reviewed' }))}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                        reviewForm.status === 'reviewed'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </span>
                    </button>
                    <button
                      onClick={() => setReviewForm(prev => ({ ...prev, status: 'rejected' }))}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                        reviewForm.status === 'rejected'
                          ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </span>
                    </button>
                  </div>
                </div>

                {/* Remarks */}
                <ModalField
                  label="Remarks"
                  required={reviewForm.status === 'rejected'}
                  hint={reviewForm.status === 'rejected' ? 'Explain what needs to be corrected' : 'Optional'}
                >
                  <textarea
                    value={reviewForm.remarks}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className={modalTextareaCls}
                    rows={3}
                    placeholder={reviewForm.status === 'rejected' ? 'Explain what needs to be corrected...' : 'Optional remarks'}
                  />
                </ModalField>
              </div>
            </ModalBody>

            <ModalFooter>
              <ModalBtnSecondary onClick={() => setShowReviewModal(false)}>
                Cancel
              </ModalBtnSecondary>
              <ModalBtnPrimary
                onClick={handleReview}
                loading={reviewing}
                className={reviewForm.status === 'rejected' ? '!bg-red-600 hover:!bg-red-700' : '!bg-emerald-600 hover:!bg-emerald-700'}
              >
                {reviewForm.status === 'reviewed' ? 'Approve' : 'Reject'}
              </ModalBtnPrimary>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
