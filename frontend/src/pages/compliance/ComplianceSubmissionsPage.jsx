import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useComplianceSubmissions } from '../../hooks/useCompliance';
import { useFetch } from '../../hooks/useFetch';
import ComplianceStatusBadge from '../../components/compliance/ComplianceStatusBadge';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'overdue', label: 'Overdue' },
];

export default function ComplianceSubmissionsPage() {
  const [filters, setFilters] = useState({
    status: '',
    compliance_type_id: '',
    teacher_id: '',
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'reviewed', remarks: '' });
  const [reviewing, setReviewing] = useState(false);

  const { submissions, loading, fetchSubmissions, reviewSubmission, bulkReview, addComment, fetchComments } = useComplianceSubmissions(filters);
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

  const handleOpenReview = async (submission) => {
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
      await bulkReview(selectedIds, {
        status,
        remarks: result.value || `Bulk ${status} by admin`,
      });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">All Submissions</h2>
        <span className="text-sm text-slate-500">{submissions.length} total</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={filters.compliance_type_id}
            onChange={(e) => setFilters(prev => ({ ...prev, compliance_type_id: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Types</option>
            {typesList.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={filters.teacher_id}
            onChange={(e) => setFilters(prev => ({ ...prev, teacher_id: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Teachers</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.first_name} {t.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-bold text-violet-800">{selectedIds.length} selected</span>
          <button
            onClick={() => handleBulkReview('reviewed')}
            className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
          >
            Approve All
          </button>
          <button
            onClick={() => handleBulkReview('rejected')}
            className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
          >
            Reject All
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse flex gap-4">
              <div className="h-4 w-4 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-4 bg-slate-200 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={submissions.length > 0 && selectedIds.length === submissions.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                  </th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Files</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map(sub => (
                  <tr key={sub.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(sub.id) ? 'bg-violet-50' : ''}`}>
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(sub.id)}
                        onChange={() => toggleSelect(sub.id)}
                        className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{sub.teacher_name}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{sub.compliance_type_name}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{formatPeriod(sub)}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{sub.file_count} file{sub.file_count !== 1 ? 's' : ''}</td>
                    <td className="px-5 py-3.5">
                      <ComplianceStatusBadge status={sub.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenReview(sub)}
                        className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                      No submissions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`Review: ${reviewingSubmission?.teacher_name || ''}`}
        subtitle={reviewingSubmission ? `${reviewingSubmission.compliance_type_name} — Period ${reviewingSubmission.period_number}` : ''}
        size="lg"
      >
        {reviewingSubmission && (
          <div className="p-5 space-y-4">
            {reviewingSubmission.file_count > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">Submitted Files</h4>
                <div className="space-y-2">
                  {reviewingSubmission.files?.map(file => (
                    <div key={file.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                      <span className="text-xl">📄</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{file.original_filename}</p>
                        <p className="text-xs text-slate-400">
                          {(file.file_size_bytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewingSubmission.remarks && reviewingSubmission.status === 'rejected' && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-sm font-medium text-red-700">Previous Rejection Remark:</p>
                <p className="text-sm text-red-600 mt-1">{reviewingSubmission.remarks}</p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-2">Decision</h4>
              <div className="flex gap-3">
                <button
                  onClick={() => setReviewForm(prev => ({ ...prev, status: 'reviewed' }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    reviewForm.status === 'reviewed'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => setReviewForm(prev => ({ ...prev, status: 'rejected' }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    reviewForm.status === 'rejected'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  ✗ Reject
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Remarks {reviewForm.status === 'rejected' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={reviewForm.remarks}
                onChange={(e) => setReviewForm(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                rows={3}
                placeholder={reviewForm.status === 'rejected' ? 'Explain what needs to be corrected...' : 'Optional remarks'}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={reviewing}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
                  reviewForm.status === 'reviewed' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {reviewing ? 'Processing...' : reviewForm.status === 'reviewed' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
