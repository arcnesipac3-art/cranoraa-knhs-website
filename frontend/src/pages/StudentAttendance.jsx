import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  Skeleton, EmptyState
} from '../components/ui';
import {
  Calendar, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  Clock, ShieldCheck, TrendingUp, BookOpen, AlertTriangle,
  FileText, Upload, X
} from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../components/ui/Modal';
import { useScrollLock } from '../hooks/useScrollLock';

const StudentAttendance = () => {
  const [records, setRecords] = useState([]);
  const [groupedRecords, setGroupedRecords] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 });
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [expandedDate, setExpandedDate] = useState(null);
  const [viewMode, setViewMode] = useState('calendar');

  // Excuse modal state
  const [excuseModal, setExcuseModal] = useState(null); // { attendanceId, subject, date, status }
  const [excuseReason, setExcuseReason] = useState('');
  const [excuseFile, setExcuseFile] = useState(null);
  const [submittingExcuse, setSubmittingExcuse] = useState(false);

  useScrollLock(!!excuseModal);

  useEffect(() => {
    fetchAttendance();
  }, [month]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/student-history/', {
        params: { month, group_by_date: 'true' }
      });
      setRecords(res.data.records || []);
      setGroupedRecords(res.data.grouped_by_date || []);
      setStats(res.data.stats || { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 });
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() - 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const nextMonth = () => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + 1);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (nextMonthStr <= currentMonth) {
      setMonth(nextMonthStr);
    }
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'absent': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'late': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'excused': return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      case 'no_class': return <Calendar className="w-4 h-4 text-slate-400" />;
      default: return <span className="w-4 h-4 block" />;
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700';
      case 'absent': return 'bg-red-100 text-red-700';
      case 'late': return 'bg-amber-100 text-amber-700';
      case 'excused': return 'bg-blue-100 text-blue-700';
      case 'no_class': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const getDayStatusSummary = (dayGroup) => {
    if (dayGroup.is_holiday) return 'no_class';
    const allPeriods = [...(dayGroup.homeroom ? [dayGroup.homeroom] : []), ...dayGroup.periods];
    if (allPeriods.length === 0) return 'empty';
    const statuses = allPeriods.map(p => p.status);
    if (statuses.every(s => s === 'present')) return 'present';
    if (statuses.some(s => s === 'absent')) return 'absent';
    if (statuses.some(s => s === 'late')) return 'late';
    if (statuses.some(s => s === 'excused')) return 'excused';
    return 'present';
  };

  const calendarDays = useMemo(() => {
    const [year, mon] = month.split('-').map(Number);
    const firstDay = new Date(year, mon - 1, 1);
    const lastDay = new Date(year, mon, 0);
    const daysInMonth = lastDay.getDate();
    const startPadding = firstDay.getDay(); // 0=Sun

    const groupedMap = {};
    groupedRecords.forEach(g => { groupedMap[g.date] = g; });

    const days = [];
    // Padding
    for (let i = 0; i < startPadding; i++) {
      days.push({ day: null, date: null, empty: true });
    }
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const group = groupedMap[dateStr];
      days.push({
        day: d,
        date: dateStr,
        empty: false,
        group,
        status: group ? getDayStatusSummary(group) : 'empty',
      });
    }
    return days;
  }, [month, groupedRecords]);

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleSubmitExcuse = async () => {
    if (!excuseReason.trim()) return toast.error('Please enter a reason');
    setSubmittingExcuse(true);
    try {
      const fd = new FormData();
      fd.append('attendance', excuseModal.attendanceId);
      fd.append('reason', excuseReason.trim());
      if (excuseFile) fd.append('document', excuseFile);
      await api.post('/absence-excuses/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Excuse submitted for review');
      setExcuseModal(null);
      setExcuseReason('');
      setExcuseFile(null);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to submit excuse');
    } finally {
      setSubmittingExcuse(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton.PageHeader />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.AttendanceCard key={i} />)}
        </div>
        <Skeleton.Table rows={5} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-semibold ${viewMode === 'calendar' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold ${viewMode === 'list' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              List
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.present || 0}</p>
                <p className="text-xs text-slate-500">Present</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.absent || 0}</p>
                <p className="text-xs text-slate-500">Absent</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.late || 0}</p>
                <p className="text-xs text-slate-500">Late</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.rate || 0}%</p>
                <p className="text-xs text-slate-500">Attendance Rate</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card>
          <CardHeader divider>
            <CardTitle>{monthLabel}</CardTitle>
          </CardHeader>
          <CardBody className="p-4">
            {groupedRecords.length === 0 ? (
              <EmptyState
                title="No Records"
                description={`No attendance records found for ${monthLabel}`}
                icon={<Calendar className="w-8 h-8" />}
              />
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase py-2">
                    {day}
                  </div>
                ))}
                {calendarDays.map((item, idx) => {
                  if (item.empty) return <div key={`empty-${idx}`} />;
                  const isExpanded = expandedDate === item.date;
                  const dayGroup = item.group;
                  const dayStatusColor = {
                    present: 'bg-green-50 border-green-200',
                    absent: 'bg-red-50 border-red-200',
                    late: 'bg-amber-50 border-amber-200',
                    excused: 'bg-blue-50 border-blue-200',
                    no_class: 'bg-slate-50 border-slate-200',
                    empty: 'bg-white border-slate-100',
                  }[item.status] || 'bg-white border-slate-100';

                  return (
                    <div key={item.date} className="relative">
                      <button
                        onClick={() => setExpandedDate(isExpanded ? null : item.date)}
                        className={`w-full aspect-square p-1 rounded-lg border text-sm transition-all hover:shadow-sm ${dayStatusColor} ${
                          isExpanded ? 'ring-2 ring-violet-400' : ''
                        }`}
                      >
                        <span className="font-semibold text-slate-700">{item.day}</span>
                        {dayGroup && !dayGroup.is_holiday && (
                          <div className="flex justify-center gap-0.5 mt-0.5">
                            {(dayGroup.homeroom ? [dayGroup.homeroom] : dayGroup.periods).slice(0, 3).map((p, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  p.status === 'present' ? 'bg-green-500' :
                                  p.status === 'absent' ? 'bg-red-500' :
                                  p.status === 'late' ? 'bg-amber-500' :
                                  p.status === 'excused' ? 'bg-blue-500' : 'bg-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        {dayGroup?.is_holiday && (
                          <div className="flex justify-center mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          </div>
                        )}
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && dayGroup && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                          <p className="text-xs font-bold text-slate-700 mb-2">
                            {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </p>
                          {dayGroup.is_holiday ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>{dayGroup.holiday_info?.title || 'No Class'}</span>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {dayGroup.homeroom && (
                                <div className="flex items-center justify-between text-xs p-1.5 bg-slate-50 rounded">
                                  <span className="text-slate-600 font-medium">Homeroom</span>
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusColor(dayGroup.homeroom.status)}`}>
                                    {statusIcon(dayGroup.homeroom.status)}
                                    {dayGroup.homeroom.status}
                                  </span>
                                </div>
                              )}
                              {dayGroup.periods.map((period, i) => (
                                <div key={i} className="flex items-center justify-between text-xs p-1.5 bg-slate-50 rounded">
                                  <div className="min-w-0">
                                    <span className="font-medium text-slate-700">{period.subject}</span>
                                    {period.time_slot && (
                                      <span className="text-slate-400 ml-1">{period.time_slot.start_time}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusColor(period.status)}`}>
                                      {statusIcon(period.status)}
                                      {period.status}
                                    </span>
                                    {(period.status === 'absent' || period.status === 'late') && !period.has_excuse && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setExcuseModal({ attendanceId: period.id, subject: period.subject, date: item.date, status: period.status }); }}
                                        className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded hover:bg-violet-100 transition-colors"
                                      >
                                        Excuse
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {dayGroup.homeroom === null && dayGroup.periods.length === 0 && (
                                <p className="text-xs text-slate-400 italic">No records</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {groupedRecords.length === 0 ? (
            <EmptyState
              title="No Records"
              description={`No attendance records found for ${monthLabel}`}
              icon={<Calendar className="w-8 h-8" />}
            />
          ) : (
            <div className="space-y-3">
              {groupedRecords.map(dayGroup => {
                const allPeriods = [...(dayGroup.homeroom ? [{ ...dayGroup.homeroom, subject: 'Homeroom' }] : []), ...dayGroup.periods];
                const dayStatus = getDayStatusSummary(dayGroup);

                return (
                  <Card key={dayGroup.date}>
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            dayGroup.is_holiday ? 'bg-slate-100' :
                            dayStatus === 'present' ? 'bg-green-100' :
                            dayStatus === 'absent' ? 'bg-red-100' :
                            dayStatus === 'late' ? 'bg-amber-100' : 'bg-blue-100'
                          }`}>
                            {dayGroup.is_holiday ? (
                              <Calendar className="w-5 h-5 text-slate-400" />
                            ) : statusIcon(dayStatus)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {new Date(dayGroup.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </h4>
                            {dayGroup.is_holiday && dayGroup.holiday_info && (
                              <p className="text-xs text-slate-500">{dayGroup.holiday_info.title}</p>
                            )}
                          </div>
                        </div>
                        {!dayGroup.is_holiday && (
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusColor(dayStatus)}`}>
                            {dayStatus === 'present' ? 'All Present' : dayStatus === 'absent' ? 'Has Absences' : dayStatus}
                          </span>
                        )}
                      </div>

                      {!dayGroup.is_holiday && allPeriods.length > 0 && (
                        <div className="space-y-1.5">
                          {allPeriods.map((period, i) => (
                            <div key={i} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-medium text-slate-700">{period.subject}</span>
                                {period.classroom && <span className="text-slate-400">— {period.classroom}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                {period.time_slot && (
                                  <span className="text-slate-400">{period.time_slot.start_time}</span>
                                )}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(period.status)}`}>
                                  {statusIcon(period.status)}
                                  {period.status}
                                </span>
                                {(period.status === 'absent' || period.status === 'late') && !period.has_excuse && (
                                  <button
                                    onClick={() => setExcuseModal({ attendanceId: period.id, subject: period.subject, date: dayGroup.date, status: period.status })}
                                    className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded hover:bg-violet-100 transition-colors"
                                  >
                                    Excuse
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Submit Excuse Modal */}
      <Modal isOpen={!!excuseModal} onClose={() => { setExcuseModal(null); setExcuseReason(''); setExcuseFile(null); }} size="sm">
        <ModalHeader onClose={() => { setExcuseModal(null); setExcuseReason(''); setExcuseFile(null); }}>
          <ModalTitle title="Submit Excuse" subtitle={excuseModal ? `${excuseModal.subject} — ${excuseModal.date}` : ''} />
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700">
              You are submitting an excuse for a <strong>{excuseModal?.status}</strong> record.
              This will be sent to your teacher for review.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason *</label>
            <textarea
              value={excuseReason}
              onChange={(e) => setExcuseReason(e.target.value)}
              placeholder="Explain the reason for your absence/lateness..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Supporting Document (optional)</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500 truncate">{excuseFile ? excuseFile.name : 'Choose file...'}</span>
                <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setExcuseFile(e.target.files?.[0] || null)} />
              </label>
              {excuseFile && (
                <button onClick={() => setExcuseFile(null)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Image, PDF, or document (max 10MB)</p>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => { setExcuseModal(null); setExcuseReason(''); setExcuseFile(null); }}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitExcuse}
            disabled={submittingExcuse || !excuseReason.trim()}
            className="px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingExcuse ? 'Submitting...' : 'Submit Excuse'}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default StudentAttendance;
