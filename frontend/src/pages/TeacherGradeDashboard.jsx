import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
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

const SubmissionCard = ({ submission, onSubmit, onReopen }) => {
  const style = STATUS_STYLES[submission.status] || STATUS_STYLES.draft;
  const isEditable = submission.status === 'draft' || submission.status === 'in_progress';
  const isLocked = submission.status === 'locked';

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
          <div>
            <h4 className="font-semibold text-gray-900">{submission.subject_name}</h4>
            <p className="text-sm text-gray-500">{submission.classroom_name}</p>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
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
              <span className="font-medium">Rejection reason:</span> {submission.rejection_reason}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          {isEditable && (
            <Button
              size="sm"
              onClick={() => onSubmit(submission)}
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              Submit Grades
            </Button>
          )}
          {isLocked && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReopen(submission)}
            >
              Request Reopening
            </Button>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {submission.updated_at && new Date(submission.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const SubmitConfirmationModal = ({ isOpen, onClose, submission, summary, onConfirm }) => {
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
              {!summary.validation_passed && (
                <div className="mt-3 p-2 bg-amber-100 rounded-lg">
                  <p className="text-xs text-amber-800 font-medium">
                    Warning: {summary.missing_grades} student(s) have missing grades.
                  </p>
                </div>
              )}
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
        <Button onClick={onConfirm} className="bg-brand-600 hover:bg-brand-700 text-white">
          Confirm Submission
        </Button>
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
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionSummary, setSubmissionSummary] = useState(null);
  const [filterTab, setFilterTab] = useState('pending');

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

  const confirmSubmit = async () => {
    if (!selectedSubmission) return;
    try {
      await api.post(`/grade-submissions/${selectedSubmission.id}/submit/`);
      toast.success('Grades submitted successfully');
      setShowSubmitModal(false);
      setSelectedSubmission(null);
      fetchDashboard();
    } catch (err) {
      if (err.response?.data?.warnings) {
        toast.error(`${err.response.data.warning_count} warnings found. Check your grades.`);
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

  const allSubmissions = dashboard ? [
    ...dashboard.pending_classes,
    ...dashboard.submitted_classes,
    ...dashboard.overdue_classes,
  ] : [];

  const filteredSubmissions = allSubmissions.filter(s => {
    if (filterTab === 'pending') return s.status === 'draft' || s.status === 'in_progress';
    if (filterTab === 'submitted') return s.status === 'submitted' || s.status === 'reviewed';
    if (filterTab === 'overdue') return dashboard.overdue_classes.some(o => o.id === s.id);
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grade Submission Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and submit grades for your classes</p>
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
              className={`rounded-xl p-4 ${
                dashboard.days_remaining < 0 ? 'bg-red-50 border border-red-200' :
                dashboard.days_remaining <= 2 ? 'bg-amber-50 border border-amber-200' :
                'bg-green-50 border border-green-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Active Grading Period: Q{dashboard.active_grading_period.quarter}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {dashboard.active_grading_period.academic_year_name} - Deadline: {dashboard.submission_deadline}
                  </p>
                </div>
                <div className={`text-right ${
                  dashboard.days_remaining < 0 ? 'text-red-600' :
                  dashboard.days_remaining <= 2 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  <p className="text-2xl font-bold">
                    {dashboard.days_remaining < 0
                      ? `Overdue by ${Math.abs(dashboard.days_remaining)} days`
                      : dashboard.days_remaining === 0
                      ? 'Due Today'
                      : `${dashboard.days_remaining} days`}
                  </p>
                  <p className="text-xs">remaining</p>
                </div>
              </div>
            </motion.div>
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

          <div className="flex items-center gap-2 border-b border-gray-200">
            {['pending', 'submitted', 'overdue', 'all'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filterTab === tab
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'pending' && dashboard?.total_pending > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                    {dashboard.total_pending}
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
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      <SubmitConfirmationModal
        isOpen={showSubmitModal}
        onClose={() => { setShowSubmitModal(false); setSelectedSubmission(null); }}
        submission={selectedSubmission}
        summary={submissionSummary}
        onConfirm={confirmSubmit}
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
