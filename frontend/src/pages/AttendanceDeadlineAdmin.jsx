import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  Skeleton, EmptyState, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle,
} from '../components/ui';
import {
  Clock, Lock, Unlock, Plus, Trash2, RefreshCw, Calendar,
  Search,
} from 'lucide-react';

const AttendanceDeadlineAdmin = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [classrooms, setClassrooms] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Create form state
  const [selectedClassrooms, setSelectedClassrooms] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openTime, setOpenTime] = useState('07:00');
  const [deadlineMinutes, setDeadlineMinutes] = useState(30);
  const [lockMinutes, setLockMinutes] = useState(60);
  const [creating, setCreating] = useState(false);

  const fetchDeadlines = useCallback(async () => {
    try {
      const params = {};
      if (dateFilter) {
        params.date_from = dateFilter;
        params.date_to = dateFilter;
      }
      const res = await api.get('/attendance-deadlines/', { params });
      setDeadlines(res.data.results || res.data);
    } catch {
      toast.error('Failed to load deadlines');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter]);

  const fetchClassrooms = async () => {
    try {
      const res = await api.get('/classrooms/');
      setClassrooms(res.data.results || res.data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchDeadlines();
    fetchClassrooms();
  }, [fetchDeadlines]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeadlines();
  };

  const generateDates = (start, end) => {
    const dates = [];
    let current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      const day = current.getDay();
      if (day >= 1 && day <= 5) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleCreate = async () => {
    if (!selectedClassrooms.length || !startDate || !endDate) {
      toast.error('Please select classrooms and date range');
      return;
    }
    setCreating(true);
    try {
      const dates = generateDates(startDate, endDate);
      const res = await api.post('/attendance-deadlines/bulk-create/', {
        classroom_ids: selectedClassrooms,
        dates,
        open_time: openTime,
        deadline_minutes: deadlineMinutes,
        lock_minutes: lockMinutes,
      });
      toast.success(`Created ${res.data.created} deadline(s)`);
      setShowCreate(false);
      setSelectedClassrooms([]);
      setStartDate('');
      setEndDate('');
      fetchDeadlines();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create deadlines');
    } finally {
      setCreating(false);
    }
  };

  const handleLock = async (id) => {
    try {
      await api.post(`/attendance-deadlines/${id}/lock/`);
      toast.success('Deadline locked');
      fetchDeadlines();
    } catch {
      toast.error('Failed to lock deadline');
    }
  };

  const handleUnlock = async (id) => {
    try {
      await api.post(`/attendance-deadlines/${id}/unlock/`);
      toast.success('Deadline unlocked');
      fetchDeadlines();
    } catch {
      toast.error('Failed to unlock deadline');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this deadline?')) return;
    try {
      await api.delete(`/attendance-deadlines/${id}/`);
      toast.success('Deadline deleted');
      fetchDeadlines();
    } catch {
      toast.error('Failed to delete deadline');
    }
  };

  const filteredDeadlines = deadlines.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (d.classroom_name || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="space-y-5 px-4 md:px-6 py-6">
        <Skeleton.PageHeader />
        <Skeleton.Table rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Attendance Deadlines</h1>
          <p className="text-sm text-slate-500 mt-1">Manage attendance submission deadlines per class</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Create Deadlines
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by classroom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
        </CardBody>
      </Card>

      {/* Deadlines Table */}
      <Card>
        <CardHeader divider>
          <CardTitle>Deadlines ({filteredDeadlines.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {filteredDeadlines.length === 0 ? (
            <EmptyState
              title="No Deadlines"
              description="No attendance deadlines configured yet"
              icon={<Clock className="w-8 h-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Classroom</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Open Time</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Deadline</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Auto-Lock</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredDeadlines.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{d.classroom_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {d.date}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{d.open_time}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{d.deadline_minutes} min</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{d.lock_minutes} min</td>
                      <td className="px-4 py-3 text-center">
                        {d.is_locked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                            <Unlock className="w-3 h-3" /> Open
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {d.is_locked ? (
                            <button
                              onClick={() => handleUnlock(d.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Unlock"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLock(d.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Lock"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} size="md">
        <ModalHeader onClose={() => setShowCreate(false)}>
          <ModalTitle title="Create Attendance Deadlines" subtitle="Set deadlines for multiple classes at once" />
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Classrooms *</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {classrooms.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">No classrooms available</p>
              ) : (
                classrooms.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedClassrooms.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClassrooms([...selectedClassrooms, c.id]);
                        } else {
                          setSelectedClassrooms(selectedClassrooms.filter((id) => id !== c.id));
                        }
                      }}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-700">{c.name}</span>
                    {c.grade_level && <span className="text-xs text-slate-400">Grade {c.grade_level}</span>}
                  </label>
                ))
              )}
            </div>
            {classrooms.length > 0 && (
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setSelectedClassrooms(classrooms.map((c) => c.id))}
                  className="text-[10px] font-bold text-violet-600 hover:text-violet-800"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClassrooms([])}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Open Time</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Deadline (min)</label>
              <input
                type="number"
                value={deadlineMinutes}
                onChange={(e) => setDeadlineMinutes(Number(e.target.value))}
                min={5}
                max={120}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Auto-Lock (min)</label>
              <input
                type="number"
                value={lockMinutes}
                onChange={(e) => setLockMinutes(Number(e.target.value))}
                min={10}
                max={240}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">
              Deadlines will be created for weekdays only within the selected date range.
              Each deadline configures when attendance becomes available and when it auto-locks.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Deadlines'}
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AttendanceDeadlineAdmin;
