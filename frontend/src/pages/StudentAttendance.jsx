import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  Skeleton, EmptyState
} from '../components/ui';
import {
  Calendar, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  Clock, ShieldCheck, AlertTriangle, BookOpen, TrendingUp
} from 'lucide-react';

const StudentAttendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    fetchAttendance();
  }, [month]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/student-history/', { params: { month } });
      setRecords(res.data.records || []);
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
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'late':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'excused':
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      case 'school_activity':
        return <BookOpen className="w-4 h-4 text-violet-500" />;
      case 'medical_leave':
        return <AlertTriangle className="w-4 h-4 text-pink-500" />;
      case 'no_class':
        return <Calendar className="w-4 h-4 text-slate-400" />;
      default:
        return <span className="w-4 h-4 block" />;
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700';
      case 'absent': return 'bg-red-100 text-red-700';
      case 'late': return 'bg-amber-100 text-amber-700';
      case 'excused': return 'bg-blue-100 text-blue-700';
      case 'school_activity': return 'bg-violet-100 text-violet-700';
      case 'medical_leave': return 'bg-pink-100 text-pink-700';
      case 'no_class': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  // Separate holiday records from attendance records
  const holidays = records.filter(r => r.status === 'no_class');
  const attendanceRecords = records.filter(r => r.status !== 'no_class');

  // Group by subject (attendance records only)
  const grouped = attendanceRecords.reduce((acc, rec) => {
    const key = rec.subject_name || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(rec);
    return acc;
  }, {});

  // Overall stats (attendance records only, exclude holidays)
  const stats = {
    present: attendanceRecords.filter(r => r.status === 'present').length,
    absent: attendanceRecords.filter(r => r.status === 'absent').length,
    late: attendanceRecords.filter(r => r.status === 'late').length,
    excused: attendanceRecords.filter(r => r.status === 'excused').length,
    total: attendanceRecords.length,
  };
  const attendanceRate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton.DashboardPage />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
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
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
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
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
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
                <p className="text-2xl font-bold text-amber-600">{stats.late}</p>
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
                <p className="text-2xl font-bold text-blue-600">{attendanceRate}%</p>
                <p className="text-xs text-slate-500">Attendance Rate</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Attendance Records */}
      {records.length === 0 ? (
        <EmptyState
          title="No Records"
          description={`No attendance records found for ${monthLabel}`}
          icon={<Calendar className="w-8 h-8" />}
        />
      ) : (
        <>
          {/* Holiday / No Class rows */}
          {holidays.length > 0 && (
            <Card>
              <CardHeader divider>
                <CardTitle>No Class Days</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b-2 border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {holidays.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50 bg-slate-50/50">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{rec.holiday_type_display}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              No Class
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            <span className="font-medium text-slate-700">{rec.holiday_title}</span>
                            {rec.remarks && <span className="ml-1 text-slate-400">— {rec.remarks}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Attendance by subject */}
          {Object.entries(grouped).map(([subject, recs]) => (
            <Card key={subject}>
              <CardHeader divider>
                <CardTitle>{subject}</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b-2 border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Class</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {recs.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{rec.schedule_name || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${statusColor(rec.status)}`}>
                              {statusIcon(rec.status)}
                              {rec.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 italic">{rec.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

export default StudentAttendance;
