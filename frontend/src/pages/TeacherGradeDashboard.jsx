import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  Button, FormField,
  Modal, ModalHeader, ModalBody, ModalFooter,
  EmptyState, Skeleton,
} from '../components/ui';

const STATUS_STYLES = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
  submitted: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Submitted' },
  reviewed: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Reviewed' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  locked: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Locked' },
};

const ProgressBar = ({ percentage }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <motion.div
      className={`h-2 rounded-full ${
        percentage >= 100 ? 'bg-green-500' :
        percentage >= 75 ? 'bg-blue-500' :
        percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
      }`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(percentage, 100)}%` }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  </div>
);

const StatCard = ({ title, value, color, icon }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${color}`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${icon}`}>
        {title === 'Pending Grades' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {title === 'Submitted' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {title === 'Overdue' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )}
        {title === 'Due Today' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  </motion.div>
);

const SubmissionCard = ({ submission, onSubmit, onReopen, onEnterGrades, onDelete, isAdmin }) => {
  const style = STATUS_STYLES[submission.status] || STATUS_STYLES.draft;
  const isEditable = submission.status === 'draft' || submission.status === 'in_progress';
  const isLocked = submission.status === 'locked';
  const isApproved = submission.status === 'approved';
  const canEnterGrades = isEditable || submission.status === 'rejected';
  const [showGrades, setShowGrades] = useState(false);
  const [grades, setGrades] = useState(null);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const toggleGrades = async () => {
    if (showGrades) { setShowGrades(false); return; }
    setShowGrades(true);
    if (grades) return;
    setLoadingGrades(true);
    try {
      const res = await api.get(`/grade-submissions/${submission.id}/summary/`);
      setGrades(res.data);
    } catch { setGrades(null); }
    setLoadingGrades(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-gray-900 truncate">{submission.subject_name}</h4>
            <p className="text-sm text-gray-500 truncate">{submission.classroom_name}</p>
            {submission.grading_period_quarter && (
              <p className="text-xs text-gray-400 mt-0.5">
                Term {submission.grading_period_quarter}
                {submission.grading_period_deadline && (
                  <span className="ml-1">· Due {new Date(submission.grading_period_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                )}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${style.bg} ${style.text}`}>
            {style.label}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Students Graded</span>
            <span className="font-medium">{submission.graded_count} / {submission.total_students}</span>
          </div>
          <ProgressBar percentage={submission.completion_percentage} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{Math.round(submission.completion_percentage)}% Complete</span>
            {submission.missing_count > 0 && (
              <span className="text-red-500 text-xs">{submission.missing_count} missing</span>
            )}
          </div>
        </div>

        {submission.rejection_reason && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">
              <span className="font-medium">Rejected:</span> {submission.rejection_reason}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
          {canEnterGrades && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEnterGrades(submission)}
              className="border-violet-300 text-violet-700 hover:bg-violet-50"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Enter Grades
            </Button>
          )}
          {isEditable && (
            <Button
              size="sm"
              onClick={() => onSubmit(submission)}
              className="bg-brand-600 hover:bg-brand-700 text-white"
              disabled={submission.completion_percentage < 1}
            >
              Submit
            </Button>
          )}
          {isLocked && (
            <Button size="sm" variant="outline" onClick={() => onReopen(submission)}>
              Request Reopening
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={toggleGrades}
            className="border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {showGrades ? 'Hide' : 'View'} Grades
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(submission)}
              className="border-red-300 text-red-600 hover:bg-red-50 ml-auto"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
          )}
          {!canEnterGrades && !isLocked && !isApproved && (
            <span className="text-xs text-gray-400 ml-auto">
              {submission.updated_at && new Date(submission.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {showGrades && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {loadingGrades ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Loading grades...
              </div>
            ) : grades?.students?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-500">Student</th>
                      <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-500">Score</th>
                      <th className="text-center py-1.5 px-2 text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.students.map((s) => (
                      <tr key={s.student_id} className="border-b border-gray-50">
                        <td className="py-1.5 px-2 text-gray-700">{s.student_name}</td>
                        <td className="py-1.5 px-2 text-right font-medium text-gray-900">
                          {s.has_grade ? s.score : '—'}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {s.has_grade ? (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-100 text-green-700">Graded</span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">Missing</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-2">No grade data available.</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const SubmitConfirmationModal = ({ isOpen, onClose, submission, summary, onConfirm, warnings }) => {
  if (!submission) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>Confirm Grade Submission</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Submission Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Quarter:</span> <span className="font-medium">Q{submission.grading_period_quarter}</span></div>
              <div><span className="text-gray-500">Subject:</span> <span className="font-medium">{submission.subject_name}</span></div>
              <div><span className="text-gray-500">Section:</span> <span className="font-medium">{submission.classroom_name}</span></div>
              <div><span className="text-gray-500">Students:</span> <span className="font-medium">{submission.total_students}</span></div>
            </div>
          </div>

          {summary && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Grade Statistics</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Average Grade:</span> <span className="font-medium">{summary.average_grade?.toFixed(1) || 'N/A'}</span></div>
                <div><span className="text-gray-500">Missing Grades:</span> <span className={`font-medium ${summary.missing_grades > 0 ? 'text-red-600' : 'text-green-600'}`}>{summary.missing_grades}</span></div>
                <div><span className="text-gray-500">Highest:</span> <span className="font-medium">{summary.highest_grade?.toFixed(1) || 'N/A'}</span></div>
                <div><span className="text-gray-500">Lowest:</span> <span className="font-medium">{summary.lowest_grade?.toFixed(1) || 'N/A'}</span></div>
              </div>
            </div>
          )}

          {warnings && warnings.warnings && warnings.warnings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">
                {warnings.warning_count} Warning(s) Detected
              </h4>
              <ul className="max-h-40 overflow-y-auto space-y-1 text-sm text-red-700">
                {warnings.warnings.map((w, i) => (
                  <li key={i}>• {w.student_name}: {w.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Note:</span> After submission, you will not be able to edit these grades until an administrator reviews or reopens them.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        {warnings ? (
          <Button onClick={() => onConfirm(true)} className="bg-red-600 hover:bg-red-700 text-white">
            Submit Anyway ({warnings.warning_count} warnings)
          </Button>
        ) : (
          <Button onClick={() => onConfirm(false)} className="bg-brand-600 hover:bg-brand-700 text-white">
            Confirm Submission
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

const ReopeningRequestModal = ({ isOpen, onClose, submission, onSubmit }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for reopening');
      return;
    }
    onSubmit(submission.id, reason);
    setReason('');
  };

  if (!submission) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>Request Grade Reopening</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You are requesting to reopen grades for <strong>{submission.subject_name}</strong> in <strong>{submission.classroom_name}</strong> (Q{submission.grading_period_quarter}).
          </p>
          <FormField label="Reason for Reopening">
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need to reopen these grades..."
            />
          </FormField>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} className="bg-brand-600 hover:bg-brand-700 text-white">
          Submit Request
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default function TeacherGradeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [pendingWarnings, setPendingWarnings] = useState(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionSummary, setSubmissionSummary] = useState(null);
  const [filterTab, setFilterTab] = useState('all');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/grade-submissions/teacher_dashboard/');
      setDashboard(res.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSubmit = async (submission) => {
    setSelectedSubmission(submission);
    try {
      const res = await api.get(`/grade-submissions/${submission.id}/summary/`);
      setSubmissionSummary(res.data);
    } catch {
      setSubmissionSummary(null);
    }
    setShowSubmitModal(true);
  };

  const confirmSubmit = async (force = false) => {
    if (!selectedSubmission) return;
    try {
      const payload = force ? { force: true } : {};
      await api.post(`/grade-submissions/${selectedSubmission.id}/submit/`, payload);
      toast.success('Grades submitted successfully');
      setShowSubmitModal(false);
      setSelectedSubmission(null);
      setPendingWarnings(null);
      fetchDashboard();
    } catch (err) {
      if (err.response?.data?.warnings) {
        setPendingWarnings(err.response.data);
        toast.error(`${err.response.data.warning_count} warnings found. Review and submit anyway or go back.`);
      } else {
        toast.error(err.response?.data?.error || 'Failed to submit grades');
      }
    }
  };

  const handleReopen = (submission) => {
    setSelectedSubmission(submission);
    setShowReopenModal(true);
  };

  const submitReopening = async (submissionId, reason) => {
    try {
      await api.post('/grade-reopening-requests/', {
        submission: submissionId,
        reason,
      });
      toast.success('Reopening request submitted');
      setShowReopenModal(false);
      setSelectedSubmission(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit request');
    }
  };

  const handleEnterGrades = (submission) => {
    navigate(`/my-classes?classroom=${submission.classroom}&view=grades`);
  };

  const handleDelete = async (submission) => {
    if (!window.confirm(`Delete submission for ${submission.subject_name} (${submission.classroom_name})?`)) return;
    try {
      await api.delete(`/grade-submissions/${submission.id}/remove/`);
      toast.success('Submission deleted');
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const allSubmissions = dashboard ? [
    ...dashboard.pending_classes,
    ...dashboard.submitted_classes,
    ...dashboard.overdue_classes,
  ] : [];

  // Deduplicate by id (overdue may overlap with pending)
  const uniqueSubmissions = allSubmissions.filter(
    (s, i, arr) => arr.findIndex(x => x.id === s.id) === i
  );

  const filteredSubmissions = uniqueSubmissions.filter(s => {
    if (filterTab === 'pending') return s.status === 'draft' || s.status === 'in_progress';
    if (filterTab === 'submitted') return s.status === 'submitted' || s.status === 'reviewed';
    if (filterTab === 'locked') return s.status === 'approved' || s.status === 'locked';
    if (filterTab === 'overdue') return dashboard?.overdue_classes?.some(o => o.id === s.id);
    return true; // 'all'
  });

  const lockedCount = uniqueSubmissions.filter(s => s.status === 'approved' || s.status === 'locked').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grade Submission Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and submit grades for your classes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/teacher-grade-dashboard')}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Go to Grade Input
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      ) : (
        <>
          {dashboard?.active_grading_period && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-4 border ${
                dashboard.days_remaining < 0
                  ? 'bg-red-50 border-red-200'
                  : dashboard.days_remaining <= 2
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      dashboard.days_remaining < 0
                        ? 'bg-red-100 text-red-700'
                        : dashboard.days_remaining <= 2
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {dashboard.days_remaining < 0 ? 'Overdue' : 'Active'}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      Term {dashboard.active_grading_period.quarter} — {dashboard.active_grading_period.academic_year_name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Deadline: <strong>{dashboard.submission_deadline}</strong>
                    {dashboard.active_grading_period.description && (
                      <span className="text-gray-400 ml-2">· {dashboard.active_grading_period.description}</span>
                    )}
                  </p>
                </div>
                <div className={`text-right ${
                  dashboard.days_remaining < 0 ? 'text-red-600' :
                  dashboard.days_remaining <= 2 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  <p className="text-2xl font-extrabold leading-none">
                    {dashboard.days_remaining < 0
                      ? `${Math.abs(dashboard.days_remaining)}d overdue`
                      : dashboard.days_remaining === 0
                      ? 'Due Today'
                      : `${dashboard.days_remaining} days left`}
                  </p>
                  <p className="text-xs mt-0.5 opacity-70">
                    {dashboard.total_pending} class{dashboard.total_pending !== 1 ? 'es' : ''} pending
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {!dashboard?.active_grading_period && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-slate-600">No active grading period. Contact your admin to open one.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Pending Grades"
              value={dashboard?.total_pending || 0}
              color="border-l-4 border-l-amber-400"
              icon="bg-amber-100 text-amber-600"
            />
            <StatCard
              title="Submitted"
              value={dashboard?.total_submitted || 0}
              color="border-l-4 border-l-green-400"
              icon="bg-green-100 text-green-600"
            />
            <StatCard
              title="Overdue"
              value={dashboard?.total_overdue || 0}
              color="border-l-4 border-l-red-400"
              icon="bg-red-100 text-red-600"
            />
            <StatCard
              title="Due Today"
              value={dashboard?.total_due_today || 0}
              color="border-l-4 border-l-purple-400"
              icon="bg-purple-100 text-purple-600"
            />
          </div>

          <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
            {[
              { key: 'pending', label: 'Pending', count: dashboard?.total_pending },
              { key: 'submitted', label: 'Submitted', count: dashboard?.total_submitted },
              { key: 'overdue', label: 'Overdue', count: dashboard?.total_overdue },
              { key: 'locked', label: 'Approved / Locked', count: lockedCount },
              { key: 'all', label: 'All' },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilterTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  filterTab === key
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    key === 'overdue' ? 'bg-red-100 text-red-700' :
                    key === 'pending' ? 'bg-amber-100 text-amber-700' :
                    key === 'locked' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filteredSubmissions.length === 0 ? (
            <EmptyState
              title={`No ${filterTab} submissions`}
              description="There are no submissions matching this filter."
              icon={
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredSubmissions.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    submission={sub}
                    onSubmit={handleSubmit}
                    onReopen={handleReopen}
                    onEnterGrades={handleEnterGrades}
                    onDelete={handleDelete}
                    isAdmin={isAdmin}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      <SubmitConfirmationModal
        isOpen={showSubmitModal}
        onClose={() => { setShowSubmitModal(false); setSelectedSubmission(null); setPendingWarnings(null); }}
        submission={selectedSubmission}
        summary={submissionSummary}
        onConfirm={confirmSubmit}
        warnings={pendingWarnings}
      />

      <ReopeningRequestModal
        isOpen={showReopenModal}
        onClose={() => { setShowReopenModal(false); setSelectedSubmission(null); }}
        submission={selectedSubmission}
        onSubmit={submitReopening}
      />
    </div>
  );
}
