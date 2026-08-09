import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardBody, Button,
  Skeleton, EmptyState, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle,
} from '../components/ui';
import {
  FileText, CheckCircle, XCircle, Clock,
  User, Calendar, RefreshCw, Search, ExternalLink,
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending' },
  approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
};

const ExcuseSlipsAdmin = () => {
  const [excuses, setExcuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchExcuses = useCallback(async () => {
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/absence-excuses/', { params });
      setExcuses(res.data.results || res.data);
    } catch {
      toast.error('Failed to load excuse slips');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchExcuses(); }, [fetchExcuses]);

  const handleReview = async (action) => {
    if (!reviewModal) return;
    setReviewing(true);
    try {
      await api.post(`/absence-excuses/${reviewModal.id}/review/`, {
        action,
        notes: reviewNotes,
      });
      toast.success(`Excuse ${action}d successfully`);
      setReviewModal(null);
      setReviewNotes('');
      fetchExcuses();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${action} excuse`);
    } finally {
      setReviewing(false);
    }
  };

  const filteredExcuses = excuses.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.student_name || '').toLowerCase().includes(q) ||
      (e.reason || '').toLowerCase().includes(q) ||
      (e.attendance_date || '').includes(q)
    );
  });

  const counts = {
    pending: excuses.filter((e) => e.status === 'pending').length,
    approved: excuses.filter((e) => e.status === 'approved').length,
    rejected: excuses.filter((e) => e.status === 'rejected').length,
    all: excuses.length,
  };

  if (loading) {
    return (
      <div className="space-y-5 px-4 md:px-6 py-6">
        <Skeleton.PageHeader />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.AttendanceCard key={i} />)}
        </div>
        <Skeleton.Table rows={5} cols={5} hasAvatar />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Excuse Slips</h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage absence excuse submissions</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchExcuses}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'pending', label: 'Pending Review', color: 'amber', icon: Clock },
          { key: 'approved', label: 'Approved', color: 'green', icon: CheckCircle },
          { key: 'rejected', label: 'Rejected', color: 'red', icon: XCircle },
          { key: 'all', label: 'Total', color: 'slate', icon: FileText },
        ].map(({ key, label, color, icon: Icon }) => (
          <Card key={key}>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{counts[key]}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filters & Search */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {['pending', 'all', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${
                    filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f} {counts[f] > 0 && `(${counts[f]})`}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student, reason, or date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Excuse Slips List */}
      <Card>
        <CardBody className="p-0">
          {filteredExcuses.length === 0 ? (
            <EmptyState
              title="No Excuse Slips"
              description={filter === 'pending' ? 'No pending excuses to review' : `No ${filter} excuse slips found`}
              icon={<FileText className="w-8 h-8" />}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredExcuses.map((excuse) => {
                const config = STATUS_CONFIG[excuse.status] || STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                return (
                  <div key={excuse.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900">{excuse.student_name}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <span>{excuse.attendance_date}</span>
                            <span className="text-slate-300">|</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              excuse.attendance_status === 'absent' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {excuse.attendance_status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{excuse.reason}</p>
                          {excuse.document_url && (
                            <a
                              href={excuse.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-violet-600 hover:text-violet-800"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Document
                            </a>
                          )}
                          {excuse.reviewer_notes && (
                            <p className="text-xs text-slate-400 mt-1 italic">
                              Reviewer note: {excuse.reviewer_notes}
                            </p>
                          )}
                        </div>
                      </div>
                      {excuse.status === 'pending' && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setReviewModal(excuse); setReviewNotes(''); }}
                            className="text-xs"
                          >
                            Review
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Review Modal */}
      <Modal isOpen={!!reviewModal} onClose={() => { setReviewModal(null); setReviewNotes(''); }} size="sm">
        <ModalHeader onClose={() => { setReviewModal(null); setReviewNotes(''); }}>
          <ModalTitle
            title="Review Excuse"
            subtitle={reviewModal ? `${reviewModal.student_name} — ${reviewModal.attendance_date}` : ''}
          />
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-bold text-slate-700 mb-1">Reason</p>
            <p className="text-sm text-slate-600">{reviewModal?.reason}</p>
          </div>
          {reviewModal?.document_url && (
            <a
              href={reviewModal.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Supporting Document
            </a>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reviewer Notes (optional)</label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add notes about your decision..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2 justify-end">
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleReview('reject')}
              disabled={reviewing}
            >
              {reviewing ? 'Processing...' : 'Reject'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleReview('approve')}
              disabled={reviewing}
            >
              {reviewing ? 'Processing...' : 'Approve'}
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ExcuseSlipsAdmin;
