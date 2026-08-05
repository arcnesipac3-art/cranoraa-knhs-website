import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  Skeleton, EmptyState
} from '../../components/ui';
import {
  ArrowLeft, Users, Calendar, Clock, CheckCircle, XCircle,
  Search, Send, Save, Lock, Unlock, MessageSquare, BookOpen,
  Copy, ChevronDown, ChevronUp
} from 'lucide-react';

const statusConfig = {
  present: { active: 'bg-green-600 text-white', idle: 'bg-green-50 text-green-700 hover:bg-green-100', icon: CheckCircle, label: 'Present' },
  absent: { active: 'bg-red-600 text-white', idle: 'bg-red-50 text-red-700 hover:bg-red-100', icon: XCircle, label: 'Absent' },
  late: { active: 'bg-amber-600 text-white', idle: 'bg-amber-50 text-amber-700 hover:bg-amber-100', icon: Clock, label: 'Late' },
  excused: { active: 'bg-blue-600 text-white', idle: 'bg-blue-50 text-blue-700 hover:bg-blue-100', icon: Lock, label: 'Excused' },
};

const ScheduleAttendanceEntry = ({ scheduleId, date, classroom, onBack }) => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [remarks, setRemarks] = useState({});
  const [workflowStatus, setWorkflowStatus] = useState('draft');
  const [existingRecords, setExistingRecords] = useState({});
  const [applyToOtherPeriods, setApplyToOtherPeriods] = useState(false);
  const [otherPeriods, setOtherPeriods] = useState([]);
  const [showPeriodInfo, setShowPeriodInfo] = useState(false);

  useEffect(() => {
    fetchData();
  }, [scheduleId, date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/by_schedule/', {
        params: { schedule: scheduleId, date }
      });
      const { schedule: sched, students: studs } = res.data;
      setScheduleInfo(sched);

      const sorted = studs.sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));
      setStudents(sorted);

      const attMap = {};
      const recMap = {};
      let wfStatus = 'draft';
      sorted.forEach(s => {
        attMap[s.student_id] = s.status || null;
        recMap[s.student_id] = s.attendance_id || null;
        if (s.workflow_status) wfStatus = s.workflow_status;
      });
      setAttendance(attMap);
      setExistingRecords(recMap);
      setWorkflowStatus(wfStatus);

      const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const allSchedulesRes = await api.get('/attendance/teacher-dashboard/', { params: { date } }).catch(() => ({ data: {} }));
      const sameClassroomPeriods = (allSchedulesRes.data.classes || []).filter(
        c => c.classroom_id === sched.classroom_id && c.schedule_id !== parseInt(scheduleId)
      );
      setOtherPeriods(sameClassroomPeriods);
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    const updated = {};
    students.forEach(s => { updated[s.student_id] = 'present'; });
    setAttendance(updated);
    toast.success('All students marked present');
  };

  const clearAll = () => {
    const reset = {};
    students.forEach(s => { reset[s.student_id] = null; });
    setAttendance(reset);
    toast.success('All cleared');
  };

  const saveAllRecords = async () => {
    const records = Object.entries(attendance)
      .filter(([, status]) => status !== null)
      .map(([studentId, status]) => ({
        student_id: parseInt(studentId),
        status,
        remarks: remarks[studentId] || '',
      }));

    if (records.length === 0) {
      toast.error('No attendance to save');
      return false;
    }

    try {
      const res = await api.post('/attendance/bulk_save/', {
        schedule: parseInt(scheduleId),
        date,
        records,
      });
      if (res.data.errors?.length > 0) {
        toast.error(`Some records failed: ${res.data.errors.join('; ')}`);
      }

      if (applyToOtherPeriods && otherPeriods.length > 0) {
        const crossRes = await api.post('/attendance/bulk-save-cross-period/', {
          schedule_id: parseInt(scheduleId),
          date,
          records,
        });
        const affected = crossRes.data.affected_schedules || [];
        if (affected.length > 0) {
          const names = affected.map(a => a.subject_name).join(', ');
          toast.success(`Attendance also saved for: ${names}`);
        }
      }

      await fetchData();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save attendance');
      return false;
    }
  };

  const handleSubmit = async () => {
    if (workflowStatus !== 'draft') {
      toast.error('Attendance already submitted');
      return;
    }
    const markedCount = Object.values(attendance).filter(s => s !== null).length;
    if (markedCount === 0) {
      toast.error('No attendance records to submit');
      return;
    }
    setSubmitting(true);
    try {
      const saved = await saveAllRecords();
      if (!saved) {
        setSubmitting(false);
        return;
      }

      await api.post('/attendance/submit/', {
        schedule_id: parseInt(scheduleId),
        date,
      });
      toast.success('Attendance submitted for admin review');
      setWorkflowStatus('submitted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (workflowStatus === 'draft') return;
    setSubmitting(true);
    try {
      await api.post('/attendance/reopen/', {
        schedule_id: parseInt(scheduleId),
        date,
      });
      toast.success('Attendance reopened for editing');
      setWorkflowStatus('draft');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reopen');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const present = Object.values(attendance).filter(s => s === 'present').length;
    const absent = Object.values(attendance).filter(s => s === 'absent').length;
    const late = Object.values(attendance).filter(s => s === 'late').length;
    const excused = Object.values(attendance).filter(s => s === 'excused').length;
    const unmarked = Object.values(attendance).filter(s => s === null).length;
    return { present, absent, late, excused, unmarked, total: students.length };
  }, [attendance, students.length]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      (s.student_name || '').toLowerCase().includes(q) ||
      (s.student_email || '').toLowerCase().includes(q) ||
      (s.lrn || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton.Table rows={5} cols={4} />
      </div>
    );
  }

  if (!scheduleInfo) {
    return (
      <EmptyState
        title="Schedule Not Found"
        description="The requested schedule could not be loaded."
        icon={<Calendar className="w-8 h-8" />}
      />
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
            workflowStatus === 'submitted' ? 'bg-green-100 text-green-700' :
            workflowStatus === 'locked' ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {workflowStatus}
          </span>
          {workflowStatus === 'draft' && (
            <>
              <Button variant="secondary" size="sm" onClick={saveAllRecords} loading={saving}>
                <Save className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Save</span>
              </Button>
              <Button variant="primary" size="sm" onClick={handleSubmit} loading={submitting}>
                <Send className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Submit</span>
              </Button>
            </>
          )}
          {workflowStatus === 'submitted' && (
            <Button variant="ghost" size="sm" onClick={handleReopen} loading={submitting}>
              <Unlock className="w-4 h-4 mr-1.5" />
              Reopen
            </Button>
          )}
          {workflowStatus === 'locked' && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              Locked
            </span>
          )}
        </div>
      </div>

      {/* Schedule Info Card */}
      <Card>
        <CardBody className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900">{scheduleInfo.subject_name}</h3>
              <p className="text-xs text-slate-500">{scheduleInfo.classroom_name}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{scheduleInfo.time_slot}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{dateLabel}</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Cross-Period Bulk Attendance */}
      {otherPeriods.length > 0 && workflowStatus === 'draft' && (
        <Card>
          <CardBody className="p-3 md:p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <Copy className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Apply to Other Periods</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Save the same attendance for {otherPeriods.length} other period{otherPeriods.length > 1 ? 's' : ''} today
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApplyToOtherPeriods(!applyToOtherPeriods)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-2 ${
                      applyToOtherPeriods ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      applyToOtherPeriods ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {applyToOtherPeriods && (
                  <button
                    type="button"
                    onClick={() => setShowPeriodInfo(!showPeriodInfo)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 mt-1.5 hover:text-indigo-800"
                  >
                    {showPeriodInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showPeriodInfo ? 'Hide' : 'Show'} periods
                  </button>
                )}
              </div>
            </div>
            {applyToOtherPeriods && showPeriodInfo && (
              <div className="mt-3 ml-12 space-y-1.5">
                {otherPeriods.map(p => (
                  <div key={p.schedule_id} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'completed' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <span className="font-semibold">{p.subject_name}</span>
                    <span className="text-slate-400">{p.start_time} - {p.end_time}</span>
                    <span className={`ml-auto text-[10px] font-bold ${p.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>
                      {p.status === 'completed' ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Attendance Entry */}
      <Card>
        <CardHeader divider>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>Mark Attendance ({students.length} students)</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={markAllPresent} className="text-xs">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  All Present
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-slate-500">
                  Clear
                </Button>
              </div>
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-4 md:p-6">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-1.5 md:gap-3 mb-4 md:mb-6">
            <div className="bg-slate-50 rounded-lg p-2 md:p-3 text-center">
              <div className="text-lg md:text-xl font-bold text-slate-700">{stats.total}</div>
              <div className="text-[9px] md:text-[10px] text-slate-600 uppercase font-semibold">Total</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2 md:p-3 text-center">
              <div className="text-lg md:text-xl font-bold text-green-600">{stats.present}</div>
              <div className="text-[9px] md:text-[10px] text-green-700 uppercase font-semibold">Present</div>
            </div>
            <div className="bg-red-50 rounded-lg p-2 md:p-3 text-center">
              <div className="text-lg md:text-xl font-bold text-red-600">{stats.absent}</div>
              <div className="text-[9px] md:text-[10px] text-red-700 uppercase font-semibold">Absent</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-2 md:p-3 text-center">
              <div className="text-lg md:text-xl font-bold text-amber-600">{stats.late}</div>
              <div className="text-[9px] md:text-[10px] text-amber-700 uppercase font-semibold">Late</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 md:p-3 text-center">
              <div className="text-lg md:text-xl font-bold text-blue-600">{stats.excused}</div>
              <div className="text-[9px] md:text-[10px] text-blue-700 uppercase font-semibold">Excused</div>
            </div>
          </div>

          {/* Student List */}
          {filteredStudents.length === 0 ? (
            <EmptyState
              title="No Students"
              description={searchQuery ? "No students match your search" : "No students enrolled in this class"}
              icon={<Users className="w-8 h-8" />}
            />
          ) : (
            <>
              {['male', 'female'].map(sex => {
                const group = filteredStudents.filter(s => (s.sex || '').toLowerCase() === sex);
                if (group.length === 0) return null;
                return (
                  <div key={sex} className="mb-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-2 px-1">
                      {sex === 'male' ? 'Male' : 'Female'} Students ({group.length})
                    </h3>

                    {/* Mobile: card layout */}
                    <div className="md:hidden space-y-2">
                      {group.map((student) => (
                        <div key={student.student_id} className="p-3 bg-white border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${sex === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                              {student.student_name ? student.student_name.trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('') : '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">{student.student_name}</p>
                              <div className="flex gap-1 mt-1.5">
                                {Object.entries(statusConfig).map(([key, cfg]) => {
                                  const Icon = cfg.icon;
                                  const isActive = attendance[student.student_id] === key;
                                  return (
                                    <button
                                      key={key}
                                      onClick={() => handleStatusChange(student.student_id, key)}
                                      title={cfg.label}
                                      className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${isActive ? cfg.active : cfg.idle}`}
                                    >
                                      <Icon className="w-3.5 h-3.5" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              value={remarks[student.student_id] || ''}
                              onChange={e => setRemarks(prev => ({ ...prev, [student.student_id]: e.target.value }))}
                              placeholder="Remark..."
                              className="flex-1 text-[11px] px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop: table layout */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase w-10">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Student</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase w-48">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {group.map((student, idx) => (
                            <tr key={student.student_id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${sex === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                    {student.student_name ? student.student_name.trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('') : '?'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{student.student_name}</p>
                                    {student.lrn && <p className="text-xs text-slate-400 truncate">LRN: {student.lrn}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  {Object.entries(statusConfig).map(([key, cfg]) => {
                                    const Icon = cfg.icon;
                                    const isActive = attendance[student.student_id] === key;
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => handleStatusChange(student.student_id, key)}
                                        title={cfg.label}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${isActive ? cfg.active : cfg.idle}`}
                                      >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{cfg.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={remarks[student.student_id] || ''}
                                  onChange={e => setRemarks(prev => ({ ...prev, [student.student_id]: e.target.value }))}
                                  placeholder="Optional remark..."
                                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-400"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ScheduleAttendanceEntry;
