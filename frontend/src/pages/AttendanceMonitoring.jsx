import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  LoadingSpinner, EmptyState
} from '../components/ui';
import {
  Users, CheckCircle, AlertTriangle, TrendingUp,
  BarChart3, Calendar, Download, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

const AttendanceMonitoring = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/attendance/admin-monitoring/');
      setData(res.data);
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleExport = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get(`/attendance/export/?date_from=${today}&date_to=${today}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const { summary, teacher_stats, daily_trends, grade_rates } = data;

  const pieData = [
    { name: 'Present', value: summary.present || 0 },
    { name: 'Absent', value: summary.absent || 0 },
    { name: 'Late', value: summary.late || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Attendance Monitoring</h1>
          <p className="text-sm text-slate-500 mt-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {summary.reference_date && summary.reference_date !== new Date().toISOString().split('T')[0] && (
            <p className="text-xs text-amber-600 font-semibold mt-1">
              No classes today — showing data for {new Date(summary.reference_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{summary.total_classes}</p>
                <p className="text-xs text-slate-500">Total Classes</p>
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
                <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
                <p className="text-xs text-slate-500">Submitted</p>
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
                <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
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
                <p className="text-2xl font-bold text-blue-600">{summary.overall_rate}%</p>
                <p className="text-xs text-slate-500">Attendance Rate</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Trend */}
        <Card className="md:col-span-2">
          <CardHeader divider>
            <CardTitle>Daily Attendance Rate (7 days)</CardTitle>
          </CardHeader>
          <CardBody className="p-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={daily_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Rate']} />
                <Line type="monotone" dataKey="rate" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader divider>
            <CardTitle>Today&apos;s Breakdown</CardTitle>
          </CardHeader>
          <CardBody className="p-4">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Present</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Absent</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Late</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Grade Rates */}
      {grade_rates.length > 0 && (
        <Card>
          <CardHeader divider>
            <CardTitle>Attendance by Grade Level</CardTitle>
          </CardHeader>
          <CardBody className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={grade_rates}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="grade" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Rate']} />
                <Bar dataKey="rate" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Teacher Submission Status */}
      <Card>
        <CardHeader divider>
          <CardTitle>Teacher Submission Status</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {teacher_stats.length === 0 ? (
            <EmptyState
              title="No Data"
              description="No teacher attendance data for today"
              icon={<Users className="w-8 h-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Teacher</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Classes</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Submitted</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Pending</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {teacher_stats.map((t) => {
                    const pct = t.classes_today > 0 ? Math.round((t.submitted / t.classes_today) * 100) : 0;
                    return (
                      <tr key={t.teacher_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">{t.teacher_name}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{t.classes_today}</td>
                        <td className="px-4 py-3 text-center text-sm text-green-600 font-semibold">{t.submitted}</td>
                        <td className="px-4 py-3 text-center text-sm text-amber-600 font-semibold">{t.pending}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${pct === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default AttendanceMonitoring;
