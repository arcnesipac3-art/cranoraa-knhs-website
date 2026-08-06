import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Button,
  Modal, ModalHeader, ModalBody, ModalFooter,
  EmptyState, Skeleton,
} from '../components/ui';

const STATUS_STYLES = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
};

const RequestCard = ({ request, onApprove, onReject }) => {
  const style = STATUS_STYLES[request.status] || STATUS_STYLES.pending;
  const detail = request.submission_detail;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-gray-900">{request.teacher_name}</h4>
            <p className="text-sm text-gray-500">{detail?.classroom_name} - {detail?.subject_name}</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            {style.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
          <div><span className="text-gray-500">Quarter:</span> <span className="font-medium">Q{detail?.quarter}</span></div>
          <div><span className="text-gray-500">Status:</span> <span className="font-medium">{detail?.status}</span></div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Reason:</span> {request.reason}
          </p>
        </div>

        {request.reviewer_notes && (
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Reviewer Notes:</span> {request.reviewer_notes}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
          <span>Requested: {new Date(request.created_at).toLocaleString()}</span>
          {request.reviewed_at && (
            <span>Reviewed: {new Date(request.reviewed_at).toLocaleString()}</span>
          )}
        </div>

        {request.status === 'pending' && (
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" onClick={() => onApprove(request)} className="bg-green-600 hover:bg-green-700 text-white">
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReject(request)} className="text-red-600 border-red-300 hover:bg-red-50">
              Reject
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ReviewModal = ({ isOpen, onClose, request, action, onConfirm }) => {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(request.id, notes);
    setNotes('');
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        {action === 'approve' ? 'Approve Reopening Request' : 'Reject Reopening Request'}
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Teacher:</span> {request.teacher_name}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Class:</span> {request.submission_detail?.classroom_name} - {request.submission_detail?.subject_name}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Quarter:</span> Q{request.submission_detail?.quarter}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {action === 'approve' ? 'Notes (optional)' : 'Reason for rejection'}
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={action === 'approve' ? 'Add any notes...' : 'Explain why this is being rejected...'}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          className={action === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
        >
          {action === 'approve' ? 'Approve Request' : 'Reject Request'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default function GradeReopeningManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const res = await api.get(`/grade-reopening-requests/${params}`);
      setRequests(res.data);
    } catch {
      toast.error('Failed to load reopening requests');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setReviewAction('approve');
    setShowReviewModal(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setReviewAction('reject');
    setShowReviewModal(true);
  };

  const confirmReview = async (requestId, notes) => {
    try {
      const endpoint = reviewAction === 'approve' ? 'approve' : 'reject';
      await api.post(`/grade-reopening-requests/${requestId}/${endpoint}/`, { notes });
      toast.success(`Request ${reviewAction === 'approve' ? 'approved' : 'rejected'}`);
      setShowReviewModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process request');
    }
  };

  const statusCounts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const filteredRequests = filterStatus === 'all'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grade Reopening Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage teacher requests to reopen locked grades</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterStatus === status
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {statusCounts[status] && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-white/20">
                {statusCounts[status]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title="No Reopening Requests"
          description="There are no reopening requests matching this filter."
          icon={
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => { setShowReviewModal(false); setSelectedRequest(null); }}
        request={selectedRequest}
        action={reviewAction}
        onConfirm={confirmReview}
      />
    </div>
  );
}
