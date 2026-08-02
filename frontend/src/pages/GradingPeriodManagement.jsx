import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
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

const GradingPeriodCard = ({ period, onOpen, onClose, onLock, onExtend, onEdit }) => (
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

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="text-sm">
          <span className="text-gray-500">Start Date:</span>
          <span className="ml-2 font-medium text-gray-700">{period.start_date}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Deadline:</span>
          <span className="ml-2 font-medium text-gray-700">{period.submission_deadline}</span>
        </div>
        {period.grace_period_days > 0 && (
          <div className="text-sm">
            <span className="text-gray-500">Grace Period:</span>
            <span className="ml-2 font-medium text-gray-700">{period.grace_period_days} days</span>
          </div>
        )}
        <div className="text-sm">
          <span className="text-gray-500">Effective Deadline:</span>
          <span className="ml-2 font-medium text-gray-700">{period.effective_deadline}</span>
        </div>
      </div>

      <div className="mt-3">
        <CountdownTimer daysRemaining={period.days_remaining} deadline={period.effective_deadline} />
      </div>

      {period.description && (
        <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">{period.description}</p>
      )}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
        {period.status === 'scheduled' && (
          <Button size="sm" onClick={() => onOpen(period.id)} className="bg-green-600 hover:bg-green-700 text-white">
            Open Period
          </Button>
        )}
        {(period.status === 'open' || period.status === 'closing_soon') && (
          <>
            <Button size="sm" onClick={() => onClose(period.id)} className="bg-amber-600 hover:bg-amber-700 text-white">
              Close Period
            </Button>
            <Button size="sm" variant="outline" onClick={() => onExtend(period)}>
              Extend Deadline
            </Button>
          </>
        )}
        {period.status === 'closed' && (
          <Button size="sm" onClick={() => onLock(period.id)} className="bg-purple-600 hover:bg-purple-700 text-white">
            Lock Grades
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onEdit(period)} className="ml-auto">
          Edit
        </Button>
      </div>
    </div>
  </motion.div>
);

const CreatePeriodModal = ({ isOpen, onClose, onSave, academicYear, editingPeriod }) => {
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
    if (!form.start_date || !form.submission_deadline) {
      toast.error('Start date and deadline are required');
      return;
    }
    onSave({
      ...form,
      quarter: parseInt(form.quarter),
      grace_period_days: parseInt(form.grace_period_days) || 0,
      academic_year: academicYear?.id,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>{editingPeriod ? 'Edit Grading Period' : 'Create Grading Period'}</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
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
          <FormField label="Grace Period (days)">
            <FormInput
              type="number"
              min="0"
              value={form.grace_period_days}
              onChange={(e) => setForm({ ...form, grace_period_days: e.target.value })}
            />
          </FormField>
          <FormField label="Description">
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description for this grading period"
            />
          </FormField>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} className="bg-brand-600 hover:bg-brand-700 text-white">
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
      const params = new URLSearchParams({ academic_year: academicYear.name });
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
        toast.success('Grading period created');
      }
      setShowCreate(false);
      setEditingPeriod(null);
      fetchPeriods();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save grading period');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grading Period Management</h1>
          <p className="text-sm text-gray-500 mt-1">Configure grading windows and submission deadlines</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBulkUpdate}>
            Refresh Status
          </Button>
          <Button onClick={() => { setEditingPeriod(null); setShowCreate(true); }} className="bg-brand-600 hover:bg-brand-700 text-white">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Period
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['all', 'scheduled', 'open', 'closing_soon', 'closed', 'locked'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterStatus === status
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
            {status !== 'all' && statusCounts[status] && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-white/20">
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
        editingPeriod={editingPeriod}
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
