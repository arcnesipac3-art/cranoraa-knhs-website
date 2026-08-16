import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import { useAcademicYear } from '../context/AcademicYearContext';
import {
  Button, Badge,
  Modal, ModalHeader, ModalBody, ModalFooter,
  FormField, FormInput, FormSelect,
  EmptyState, Skeleton,
} from '../components/ui';

const STATUS_STYLES = {
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  open: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  closing_soon: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
  locked: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
};

const QuarterBadge = ({ quarter }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-brand-100 text-brand-800">
    Q{quarter}
  </span>
);

const StatusBadge = ({ status, display }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {display}
    </span>
  );
};

const CountdownTimer = ({ daysRemaining }) => {
  if (daysRemaining === null || daysRemaining === undefined) return null;
  const color = daysRemaining < 0 ? 'text-red-600'
    : daysRemaining === 0 ? 'text-amber-600'
    : daysRemaining <= 3 ? 'text-orange-500'
    : 'text-green-600';

  const label = daysRemaining < 0 ? `Overdue by ${Math.abs(daysRemaining)} days`
    : daysRemaining === 0 ? 'Due Today'
    : daysRemaining === 1 ? 'Due Tomorrow'
    : `${daysRemaining} Days Remaining`;

  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${color}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {label}
    </div>
  );
};

const GradingPeriodCard = ({ period, onOpen, onClose, onLock, onUnlock, onExtend, onEdit }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
  >
    <div className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <QuarterBadge quarter={period.quarter} />
          <div>
            <h3 className="font-semibold text-gray-900">{period.academic_year_name}</h3>
            <p className="text-sm text-gray-500">{period.quarter_display}</p>
          </div>
        </div>
        <StatusBadge status={period.status} display={period.status_display} />
      </div>

      {/* What this status means for teachers */}
      <div className={`text-xs rounded-lg px-3 py-2 mb-3 font-medium ${
        period.status === 'open' || period.status === 'closing_soon'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : period.status === 'scheduled'
          ? 'bg-blue-50 text-blue-800 border border-blue-200'
          : period.status === 'locked'
          ? 'bg-purple-50 text-purple-800 border border-purple-200'
          : 'bg-gray-50 text-gray-700 border border-gray-200'
      }`}>
        {period.status === 'scheduled' && '⏳ Not yet open — teachers cannot submit grades.'}
        {period.status === 'open' && '✅ Open — teachers can now submit grades.'}
        {period.status === 'closing_soon' && '⚠️ Closing soon — teachers should submit now.'}
        {period.status === 'closed' && '🔒 Closed — no more submissions. Lock to finalize.'}
        {period.status === 'locked' && '🔐 Locked — all grades are finalized.'}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="text-sm">
          <span className="text-gray-500">Start:</span>
          <span className="ml-2 font-medium text-gray-700">{period.start_date}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Deadline:</span>
          <span className="ml-2 font-medium text-gray-700">{period.submission_deadline}</span>
        </div>
        {period.grace_period_days > 0 && (
          <div className="text-sm sm:col-span-2">
            <span className="text-gray-500">Grace Period:</span>
            <span className="ml-2 font-medium text-gray-700">+{period.grace_period_days} days (effective: {period.effective_deadline})</span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <CountdownTimer daysRemaining={period.days_remaining} deadline={period.effective_deadline} />
      </div>

      {period.description && (
        <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">{period.description}</p>
      )}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
        {period.status === 'scheduled' && (
          <Button size="sm" onClick={() => onOpen(period.id)} className="bg-green-600 hover:bg-green-700 text-white">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Open for Teachers
          </Button>
        )}
        {(period.status === 'open' || period.status === 'closing_soon') && (
          <>
            <Button size="sm" onClick={() => onClose(period.id)} className="bg-amber-600 hover:bg-amber-700 text-white">
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Close Submissions
            </Button>
            <Button size="sm" variant="outline" onClick={() => onExtend(period)}>
              Extend Deadline
            </Button>
          </>
        )}
        {period.status === 'closed' && (
          <Button size="sm" onClick={() => onLock(period.id)} className="bg-purple-600 hover:bg-purple-700 text-white">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0" />
            </svg>
            Lock & Finalize Grades
          </Button>
        )}
        {period.status === 'locked' && (
          <Button size="sm" onClick={() => onUnlock(period.id)} className="bg-amber-600 hover:bg-amber-700 text-white">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 13v-2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Unlock Period
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onEdit(period)} className="ml-auto">
          Edit
        </Button>
      </div>
    </div>
  </motion.div>
);

const CreatePeriodModal = ({ isOpen, onClose, onSave, academicYear, academicYears, editingPeriod, onUnlock, onDeleteGrades, onOpen }) => {
  const activeYearObj = academicYears?.find(y => y.name === academicYear) || null;
  const [form, setForm] = useState({
    quarter: '1',
    start_date: '',
    submission_deadline: '',
    grace_period_days: '0',
    description: '',
  });

  useEffect(() => {
    if (editingPeriod) {
      setForm({
        quarter: String(editingPeriod.quarter),
        start_date: editingPeriod.start_date,
        submission_deadline: editingPeriod.submission_deadline,
        grace_period_days: String(editingPeriod.grace_period_days),
        description: editingPeriod.description || '',
      });
    } else {
      setForm({ quarter: '1', start_date: '', submission_deadline: '', grace_period_days: '0', description: '' });
    }
  }, [editingPeriod, isOpen]);

  const handleSubmit = () => {
    if (!activeYearObj?.id) {
      toast.error('No active school year found. Set one before creating a grading period.');
      return;
    }
    if (!form.start_date || !form.submission_deadline) {
      toast.error('Start date and deadline are required');
      return;
    }
    if (form.submission_deadline < form.start_date) {
      toast.error('Deadline must be after the start date');
      return;
    }
    onSave({
      ...form,
      quarter: parseInt(form.quarter),
      grace_period_days: parseInt(form.grace_period_days) || 0,
      academic_year: activeYearObj.id,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>{editingPeriod ? 'Edit Grading Period' : 'Create Grading Period'}</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          {!editingPeriod && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>How it works:</strong> Creating a period sets it as <em>Scheduled</em>. 
              Press <strong>Open Period</strong> on the card when you're ready for teachers to submit grades. 
              Close it when done, then Lock to finalize.
            </div>
          )}
          {!academicYear && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              No active school year found. Please set an active academic year first.
            </div>
          )}
          <FormField label="School Year">
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
              {activeYearObj?.name || academicYear || <span className="text-red-500">No active school year</span>}
            </div>
          </FormField>
          <FormField label="Term">
            <FormSelect
              value={form.quarter}
              onChange={(e) => setForm({ ...form, quarter: e.target.value })}
              disabled={!!editingPeriod}
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </FormSelect>
          </FormField>
          <FormField label="Start Date">
            <FormInput
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </FormField>
          <FormField label="Submission Deadline">
            <FormInput
              type="date"
              value={form.submission_deadline}
              onChange={(e) => setForm({ ...form, submission_deadline: e.target.value })}
            />
          </FormField>
          <FormField label="Grace Period (days)" hint="Extra days teachers can still submit after the deadline">
            <FormInput
              type="number"
              min="0"
              value={form.grace_period_days}
              onChange={(e) => setForm({ ...form, grace_period_days: e.target.value })}
            />
          </FormField>
          <FormField label="Description" hint="Optional note visible to teachers">
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Q1 grading for SY 2025-2026"
            />
          </FormField>

          {editingPeriod && (editingPeriod.status === 'locked' || editingPeriod.status === 'closed' || editingPeriod.status === 'scheduled') && (
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
              <p className="text-xs font-black text-red-500 uppercase tracking-widest">Danger Zone</p>
              {(editingPeriod.status === 'scheduled' || editingPeriod.status === 'closed') && (
                <button
                  type="button"
                  onClick={() => {
                    Swal.fire({
                      title: 'Open Submissions?',
                      html: `This will open <strong>Q${editingPeriod.quarter}</strong> for teacher grade submissions.`,
                      icon: 'info',
                      showCancelButton: true,
                      confirmButtonColor: '#16a34a',
                      confirmButtonText: 'Yes, Open',
                    }).then((result) => {
                      if (result.isConfirmed) {
                        onOpen(editingPeriod.id);
                        onClose();
                      }
                    });
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 13v-2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Open Submissions — allow teachers to submit grades
                </button>
              )}
              {editingPeriod.status === 'locked' && (
                <button
                  type="button"
                  onClick={() => {
                    Swal.fire({
                      title: 'Unlock Period?',
                      html: `This will unlock <strong>Q${editingPeriod.quarter}</strong> and reopen the period for teacher submissions.`,
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#d97706',
                      confirmButtonText: 'Yes, Unlock',
                    }).then((result) => {
                      if (result.isConfirmed) {
                        onUnlock(editingPeriod.id);
                        onClose();
                      }
                    });
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 13v-2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unlock Period — reopen for teacher submissions
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  Swal.fire({
                    title: 'Delete All Grades?',
                    html: `This will permanently delete <strong>all Q${editingPeriod.quarter} grades</strong> across every classroom for this school year. This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    confirmButtonText: 'Yes, Delete All Grades',
                  }).then((result) => {
                    if (result.isConfirmed) {
                      onDeleteGrades(editingPeriod.id);
                      onClose();
                    }
                  });
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete All Grades — remove all Q{editingPeriod.quarter} grades
              </button>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!activeYearObj} className="bg-brand-600 hover:bg-brand-700 text-white">
          {editingPeriod ? 'Save Changes' : 'Create Period'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const ExtendDeadlineModal = ({ isOpen, onClose, period, onExtend }) => {
  const [days, setDays] = useState(7);

  if (!period) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>Extend Deadline</ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600 mb-4">
          Current deadline: <strong>{period.submission_deadline}</strong> (effective: {period.effective_deadline})
        </p>
        <FormField label="Extend by (days)">
          <FormInput
            type="number"
            min="1"
            max="90"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 1)}
          />
        </FormField>
        <p className="text-sm text-gray-500 mt-2">
          New effective deadline: {(() => {
            const d = new Date(period.effective_deadline);
            d.setDate(d.getDate() + days);
            return d.toISOString().split('T')[0];
          })()}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onExtend(period.id, days)} className="bg-brand-600 hover:bg-brand-700 text-white">
          Extend Deadline
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default function GradingPeriodManagement() {
  const { academicYear } = useActiveAcademicYear();
  const { academicYears } = useAcademicYear();
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [extendPeriod, setExtendPeriod] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchPeriods = useCallback(async () => {
    if (!academicYear) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ academic_year: academicYear });
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const res = await api.get(`/grading-periods/?${params}`);
      setPeriods(res.data);
    } catch {
      toast.error('Failed to load grading periods');
    } finally {
      setLoading(false);
    }
  }, [academicYear, filterStatus]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  const handleCreate = async (data) => {
    try {
      if (editingPeriod) {
        await api.patch(`/grading-periods/${editingPeriod.id}/`, data);
        toast.success('Grading period updated');
      } else {
        await api.post('/grading-periods/', data);
        toast.success('Grading period created — press "Open Period" when ready for teachers to submit');
      }
      setShowCreate(false);
      setEditingPeriod(null);
      fetchPeriods();
    } catch (err) {
      // Extract the most useful message from the 400 response
      const errData = err.response?.data;
      let message = 'Failed to save grading period';
      if (errData) {
        if (typeof errData === 'string') {
          message = errData;
        } else if (errData.detail) {
          message = errData.detail;
        } else if (errData.non_field_errors) {
          message = Array.isArray(errData.non_field_errors)
            ? errData.non_field_errors[0]
            : errData.non_field_errors;
        } else {
          // Field-level errors — join them all
          const fieldErrors = Object.entries(errData)
            .map(([field, errs]) => {
              const msg = Array.isArray(errs) ? errs[0] : errs;
              return `${field}: ${msg}`;
            })
            .join(' · ');
          if (fieldErrors) message = fieldErrors;
        }
        // Friendlier message for the unique constraint
        if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('already exists')) {
          message = `A grading period for Term ${data.quarter} already exists in this school year. Edit the existing one instead.`;
        }
        if (message.toLowerCase().includes('academic_year') && message.toLowerCase().includes('null')) {
          message = 'No active school year found. Set an active academic year first.';
        }
      }
      toast.error(message, { duration: 5000 });
    }
  };

  const handleOpen = async (id) => {
    try {
      await api.post(`/grading-periods/${id}/open/`);
      toast.success('Grading period opened');
      fetchPeriods();
    } catch {
      toast.error('Failed to open grading period');
    }
  };

  const handleClose = async (id) => {
    try {
      await api.post(`/grading-periods/${id}/close/`);
      toast.success('Grading period closed');
      fetchPeriods();
    } catch {
      toast.error('Failed to close grading period');
    }
  };

  const handleLock = async (id) => {
    try {
      await api.post(`/grading-periods/${id}/lock/`);
      toast.success('Grading period locked and grades locked');
      fetchPeriods();
    } catch {
      toast.error('Failed to lock grading period');
    }
  };

  const handleUnlock = async (id) => {
    try {
      await api.post(`/grading-periods/${id}/unlock/`);
      toast.success('Grading period unlocked');
      fetchPeriods();
    } catch {
      toast.error('Failed to unlock grading period');
    }
  };

  const handleDeleteGrades = async (id) => {
    try {
      const res = await api.post(`/grading-periods/${id}/delete_grades/`);
      toast.success(`Deleted ${res.data.deleted} grades — period reset to closed`);
      fetchPeriods();
    } catch {
      toast.error('Failed to delete grades');
    }
  };

  const handleExtend = async (id, days) => {
    try {
      await api.post(`/grading-periods/${id}/extend_deadline/`, { days });
      toast.success(`Deadline extended by ${days} days`);
      setShowExtend(false);
      setExtendPeriod(null);
      fetchPeriods();
    } catch {
      toast.error('Failed to extend deadline');
    }
  };

  const handleBulkUpdate = async () => {
    try {
      const res = await api.post('/grading-periods/bulk_update_status/');
      toast.success(`Updated ${res.data.updated} grading periods`);
      fetchPeriods();
    } catch {
      toast.error('Failed to bulk update');
    }
  };

  const filteredPeriods = filterStatus === 'all'
    ? periods
    : periods.filter(p => p.status === filterStatus);

  const statusCounts = periods.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Grading Period Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Control when teachers can submit grades for each term</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" onClick={handleBulkUpdate} className="text-xs sm:text-sm">
            Refresh Status
          </Button>
          <Button onClick={() => { setEditingPeriod(null); setShowCreate(true); }} className="bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Period
          </Button>
        </div>
      </div>

      {/* Workflow explanation */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4">
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Admin Workflow</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: '1. Create Period', color: 'bg-blue-100 text-blue-800', hint: 'Sets dates & deadline' },
            { label: '2. Open for Teachers', color: 'bg-green-100 text-green-800', hint: 'Teachers can submit' },
            { label: '3. Close Submissions', color: 'bg-amber-100 text-amber-800', hint: 'No new submissions' },
            { label: '4. Lock & Finalize', color: 'bg-purple-100 text-purple-800', hint: 'Grades are permanent' },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <span className={`px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold ${step.color}`}>{step.label}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{step.hint}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 min-w-0">
        {['all', 'scheduled', 'open', 'closing_soon', 'closed', 'locked'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              filterStatus === status
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
            {status !== 'all' && statusCounts[status] && (
              <span className="ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs bg-white/20">
                {statusCounts[status]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filteredPeriods.length === 0 ? (
        <EmptyState
          title="No Grading Periods"
          description="Create a grading period to start managing grade submissions."
          icon={
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredPeriods.map((period) => (
              <GradingPeriodCard
                key={period.id}
                period={period}
                onOpen={handleOpen}
                onClose={handleClose}
                onLock={handleLock}
                onUnlock={handleUnlock}
                onExtend={(p) => { setExtendPeriod(p); setShowExtend(true); }}
                onEdit={(p) => { setEditingPeriod(p); setShowCreate(true); }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <CreatePeriodModal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setEditingPeriod(null); }}
        onSave={handleCreate}
        academicYear={academicYear}
        academicYears={academicYears}
        editingPeriod={editingPeriod}
        onUnlock={handleUnlock}
        onDeleteGrades={handleDeleteGrades}
        onOpen={handleOpen}
      />

      <ExtendDeadlineModal
        isOpen={showExtend}
        onClose={() => { setShowExtend(false); setExtendPeriod(null); }}
        period={extendPeriod}
        onExtend={handleExtend}
      />
    </div>
  );
}
