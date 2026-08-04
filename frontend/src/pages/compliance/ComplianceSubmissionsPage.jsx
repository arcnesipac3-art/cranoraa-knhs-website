import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useComplianceSubmissions } from '../../hooks/useCompliance';
import { useFetch } from '../../hooks/useFetch';
import api from '../../utils/api';
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
  weekly: 'W',
  monthly: 'M',
  quarterly: 'Q',
  yearly: 'Y',
};

function FreqBadge({ frequency }) {
  const map = {
    weekly:    'bg-blue-50 text-blue-600 border-blue-200',
    monthly:   'bg-violet-50 text-violet-600 border-violet-200',
    quarterly: 'bg-amber-50 text-amber-600 border-amber-200',
    yearly:    'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border text-[10px] font-black flex-shrink-0 ${map[frequency] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
      {FREQUENCY_ICONS[frequency] || '?'}
    </span>
  );
}

export default function ComplianceSubmissionsPage() {
  const [filters, setFilters] = useState({
    status: '', compliance_type_id: '', teacher_id: '',
    subject_id: '', classroom_id: '',
  });
  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'reviewed', remarks: '' });
  const [reviewing, setReviewing] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAudit, setShowAudit] = useState(false);

  const { submissions, loading, fetchSubmissions, reviewSubmission, bulkReview, fetchComments, addComment, deleteSubmission } = useComplianceSubmissions(filters);
  const { data: types }     = useFetch('/compliance/types/');
  const { data: usersData } = useFetch('/users/', { params: { role: 'staff', page_size: 200 } });
  const { data: subjectsData }   = useFetch('/subjects/');
  const { data: classroomsData } = useFetch('/classrooms/');

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions, filters]);

  const teachers    = usersData?.results   || usersData   || [];
  const typesList   = types?.results       || types       || [];
  const subjects    = subjectsData?.results || subjectsData || [];
  const classrooms  = classroomsData?.results || classroomsData || [];

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
    setComments([]);
    setNewComment('');
    setAuditLogs([]);
    setShowAudit(false);
    setShowReviewModal(true);
    setLoadingComments(true);
    try {
      const [commentsData, auditData] = await Promise.all([
        fetchComments(submission.id),
        api.get(`/compliance/audit-trail/?submission_id=${submission.id}`).then(r => r.data?.results || []).catch(() => []),
      ]);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      setAuditLogs(auditData);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await addComment(reviewingSubmission.id, newComment.trim());
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } finally {
      setSubmittingComment(false);
    }
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

  const handleDeleteSubmission = async (submission) => {
    const result = await Swal.fire({
      title: 'Delete this submission?',
      html: `<p style="color:#6b7280;font-size:0.875rem">This will permanently remove <strong>${submission.teacher_name}</strong>'s submission for <strong>${submission.compliance_type_name}</strong> (${formatPeriod(submission)}) and all its files. This cannot be undone.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      confirmButtonText: 'Yes, delete it',
    });
    if (result.isConfirmed) {
      try {
        await deleteSubmission(submission.id);
        setShowReviewModal(false);
        setSelectedIds(prev => prev.filter(id => id !== submission.id));
      } catch {
        // handled by hook
      }
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
    image: { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-blue-50 border-blue-100 text-blue-500' },
    pdf:   { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', color: 'bg-red-50 border-red-100 text-red-500' },
    word:  { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-blue-50 border-blue-100 text-blue-600' },
    excel: { icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
    ppt:   { icon: 'M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z', color: 'bg-orange-50 border-orange-100 text-orange-500' },
    office:{ icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-slate-50 border-slate-100 text-slate-500' },
    other: { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-slate-50 border-slate-100 text-slate-400' },
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openFilePreview = (file) => {
    const ftype = getFileType(file.original_filename);
    // Map granular types to preview strategy groups
    const previewType =
      ftype === 'image' ? 'image' :
      ftype === 'pdf' ? 'pdf' :
      ['word', 'excel', 'ppt', 'office'].includes(ftype) ? 'office' :
      'other';
    setPreviewFile({
      url: file.file_url,
      filename: file.original_filename,
      type: previewType,
      iframeError: false,
    });
  };

  const hasActiveFilters = filters.status || filters.compliance_type_id || filters.teacher_id
    || filters.subject_id || filters.classroom_id;

  const clearFilters = () => setFilters({
    status: '', compliance_type_id: '', teacher_id: '',
    subject_id: '', classroom_id: '',
  });

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

          {/* Status */}
          <select value={filters.status} onChange={e => setFilter('status', e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-400">
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Compliance Type */}
          <select value={filters.compliance_type_id} onChange={e => setFilter('compliance_type_id', e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-400">
            <option value="">All Types</option>
            {typesList.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Teacher */}
          <select value={filters.teacher_id} onChange={e => setFilter('teacher_id', e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-400">
            <option value="">All Teachers</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>

          {/* Subject */}
          <select value={filters.subject_id} onChange={e => setFilter('subject_id', e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-400">
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>

          {/* Classroom */}
          <select value={filters.classroom_id} onChange={e => setFilter('classroom_id', e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-400">
            <option value="">All Classrooms</option>
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs font-bold text-violet-600 hover:text-violet-700">
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
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 hidden md:block">Type</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-36 hidden lg:block">Subject / Class</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Period</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 hidden lg:block">Submitted</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Files</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Status</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-28 text-right">Action</span>
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

                {/* Teacher */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{sub.teacher_name}</p>
                  {sub.remarks && sub.status === 'rejected' && (
                    <p className="text-[11px] text-red-500 truncate mt-0.5" title={sub.remarks}>
                      ✕ {sub.remarks}
                    </p>
                  )}
                </div>

                {/* Type */}
                <div className="w-32 hidden md:flex items-center gap-1.5">
                  <FreqBadge frequency={sub.compliance_type_frequency} />
                  <span className="text-sm text-slate-600 truncate">{sub.compliance_type_name}</span>
                </div>

                {/* Subject / Classroom */}
                <div className="w-36 hidden lg:block">
                  {sub.classroom_subject_detail ? (
                    <div>
                      <p className="text-xs font-bold text-violet-600 truncate">
                        {sub.classroom_subject_detail.subject_code}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {sub.classroom_subject_detail.classroom_name}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </div>

                {/* Period */}
                <div className="w-24 text-sm text-slate-600">{formatPeriod(sub)}</div>

                {/* Submitted date */}
                <div className="w-20 hidden lg:block text-xs text-slate-400">{formatDate(sub.submitted_at)}</div>

                {/* Files */}
                <div className="w-16 text-center">
                  {sub.file_count > 0 ? (
                    <button
                      onClick={() => {
                        if (sub.files?.[0]) openFilePreview(sub.files[0]);
                        else handleOpenReview(sub);
                      }}
                      title={`${sub.file_count} file${sub.file_count !== 1 ? 's' : ''} — click to preview first`}
                      className="inline-flex items-center justify-center w-7 h-7 bg-violet-50 border border-violet-100 rounded-lg text-xs font-bold text-violet-600 hover:bg-violet-100 transition-colors"
                    >
                      {sub.file_count}
                    </button>
                  ) : (
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 rounded-lg text-xs font-bold text-slate-400">0</span>
                  )}
                </div>

                {/* Status */}
                <div className="w-24">
                  <ComplianceStatusBadge status={sub.status} size="xs" />
                </div>

                {/* Actions */}
                <div className="w-28 flex items-center justify-end gap-2">
                  {sub.file_count > 0 && (
                    <button
                      onClick={() => sub.files?.[0] && openFilePreview(sub.files[0])}
                      title="Preview first file"
                      className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenReview(sub)}
                    className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => handleDeleteSubmission(sub)}
                    title="Delete submission"
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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
        subtitle={reviewingSubmission
          ? `${reviewingSubmission.compliance_type_name} • ${formatPeriod(reviewingSubmission)}${
              reviewingSubmission.classroom_subject_detail
                ? ` • ${reviewingSubmission.classroom_subject_detail.subject_code} – ${reviewingSubmission.classroom_subject_detail.classroom_name}`
                : ''
            }`
          : ''
        }
        size="lg"
      >
        {reviewingSubmission && (
          <>
            <ModalBody>
              <div className="space-y-5">
                {/* Files */}
                {reviewingSubmission.file_count > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      Submitted Files
                      <span className="ml-2 text-violet-500 normal-case font-bold">{reviewingSubmission.file_count}</span>
                    </h4>
                    <div className="space-y-2">
                      {reviewingSubmission.files?.map(file => {
                        const ftype = getFileType(file.original_filename);
                        const icon = FILE_TYPE_ICON[ftype] || FILE_TYPE_ICON.other;
                        return (
                          <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-violet-200 transition-colors">
                            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${icon.color}`}>
                              <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon.icon} />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{file.original_filename}</p>
                              <p className="text-xs text-slate-400">
                                {file.file_size_bytes >= 1024 * 1024
                                  ? `${(file.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                                  : `${(file.file_size_bytes / 1024).toFixed(1)} KB`}
                                {' · '}{ftype.toUpperCase()}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => openFilePreview(file)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-600 hover:bg-violet-50 hover:border-violet-200 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Preview
                              </button>
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Download"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        );
                      })}
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

                {/* Inline Comments */}
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Comments
                    {comments.length > 0 && <span className="ml-2 text-violet-500 font-bold">{comments.length}</span>}
                  </h4>

                  {loadingComments ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                      <div className="w-4 h-4 border-2 border-slate-200 border-t-violet-400 rounded-full animate-spin" />
                      Loading comments…
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-3 pr-1">
                      {comments.map(c => (
                        <div key={c.id} className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-violet-600">
                            {c.author_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                            <p className="text-[11px] font-bold text-slate-600 mb-0.5">{c.author_name}</p>
                            <p className="text-xs text-slate-700 leading-relaxed">{c.content}</p>
                            <p className="text-[10px] text-slate-300 mt-1">{formatDate(c.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mb-3">No comments yet.</p>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                      placeholder="Add a comment… (Enter to send)"
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-100 focus:border-violet-400 bg-white"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="px-3 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {submittingComment ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {/* Audit Trail */}
                {auditLogs.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowAudit(p => !p)}
                      className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform ${showAudit ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                      Audit Trail
                      <span className="ml-1 text-violet-500 font-bold normal-case">{auditLogs.length}</span>
                    </button>
                    {showAudit && (
                      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                        {auditLogs.map(log => (
                          <div key={log.id} className="flex items-start gap-2.5 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                              log.action === 'approve' ? 'bg-emerald-500'
                              : log.action === 'reject' ? 'bg-red-500'
                              : log.action === 'submit' ? 'bg-blue-500'
                              : log.action === 'create' ? 'bg-violet-500'
                              : 'bg-slate-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-700">{log.action_display}</span>
                                <span className="text-[10px] text-slate-400 flex-shrink-0">
                                  {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">by {log.user_name}</p>
                              {log.details?.remarks && (
                                <p className="text-[11px] text-slate-600 mt-0.5 italic">"{log.details.remarks}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <button
                onClick={() => handleDeleteSubmission(reviewingSubmission)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mr-auto"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
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
            {/* Image preview */}
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

            {/* PDF preview */}
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

            {/* Office / other — Google Docs Viewer with fallback */}
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

            {/* Error / unsupported fallback */}
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

            {/* Footer actions */}
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
    </div>
  );
}
