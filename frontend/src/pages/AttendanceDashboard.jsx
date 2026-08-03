import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle,
  Skeleton, EmptyState
} from '../components/ui';
import {
  Calendar, Clock, Users, CheckCircle, AlertTriangle,
  ArrowRight, BookOpen, TrendingUp
} from 'lucide-react';

const AttendanceDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [holiday, setHoliday] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/attendance/teacher-dashboard/');
      if (res.data.is_holiday) {
        setHoliday(res.data);
      } else {
        setClasses(res.data);
      }
    } catch {
      toast.error('Failed to load attendance dashboard');
    } finally {
      setLoading(false);
    }
  };

  const completedCount = classes.filter(c => c.status === 'completed').length;
  const pendingCount = classes.filter(c => c.status === 'pending').length;
  const totalStudents = classes.reduce((sum, c) => sum + c.student_count, 0);
  const totalRecorded = classes.reduce((sum, c) => sum + c.recorded, 0);
  const overallRate = totalStudents > 0 ? Math.round((totalRecorded / totalStudents) * 100) : 0;

  const getStatusColor = (status) => {
    return status === 'completed'
      ? 'bg-green-100 text-green-700'
      : 'bg-amber-100 text-amber-700';
  };

  const getCompletionColor = (pct) => {
    if (pct >= 100) return 'bg-green-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-5 px-4 md:px-6 py-6">
        <Skeleton.PageHeader />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.AttendanceCard key={i} />)}
        </div>
        <Skeleton.Table rows={5} cols={4} hasAvatar />
      </div>
    );
  }

  if (holiday) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Attendance Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <Card>
          <CardBody className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{holiday.title}</h2>
            <p className="text-sm text-slate-500 mb-1">
              {holiday.type_display} &mdash; No classes today
            </p>
            {holiday.description && (
              <p className="text-xs text-slate-400 mt-2">{holiday.description}</p>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Attendance Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{classes.length}</p>
                <p className="text-xs text-slate-500">Today&apos;s Classes</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                <p className="text-xs text-slate-500">Pending</p>
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
                <p className="text-2xl font-bold text-blue-600">{overallRate}%</p>
                <p className="text-xs text-slate-500">Completion</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader divider>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardBody className="p-4">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-sm text-slate-600">{totalRecorded} / {totalStudents} students recorded</span>
            <span className="text-sm font-bold text-slate-900">{overallRate}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getCompletionColor(overallRate)}`}
              style={{ width: `${overallRate}%` }}
            />
          </div>
        </CardBody>
      </Card>

      {/* Class Cards */}
      {classes.length === 0 ? (
        <EmptyState
          title="No Classes Today"
          description="You don't have any classes scheduled for today."
          icon={<Calendar className="w-8 h-8" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <Card key={cls.schedule_id} className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/my-classes?classroom=${cls.classroom_id}&view=attendance&schedule=${cls.schedule_id}`)}>
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{cls.classroom_name}</h3>
                    <p className="text-xs text-slate-500">{cls.subject_name} ({cls.subject_code})</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(cls.status)}`}>
                    {cls.status === 'completed' ? 'Completed' : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{cls.start_time} - {cls.end_time}</span>
                  {cls.room && <span className="text-slate-400">| {cls.room}</span>}
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1 text-xs">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-600">{cls.student_count} students</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-600">{cls.recorded} recorded</span>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="flex items-center gap-2 text-[10px] mb-3">
                  <span className="text-green-600 font-semibold">{cls.present}P</span>
                  <span className="text-red-600 font-semibold">{cls.absent}A</span>
                  <span className="text-amber-600 font-semibold">{cls.late}L</span>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getCompletionColor(cls.completion)}`}
                      style={{ width: `${cls.completion}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{cls.completion}%</span>
                </div>

                <div className="flex items-center justify-end mt-3 text-xs text-violet-600 font-semibold">
                  Take Attendance <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
