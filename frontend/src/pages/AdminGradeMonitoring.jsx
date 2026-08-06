import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  EmptyState, Skeleton, FormSelect,
} from '../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';


const StatTile = ({ label, value, icon, color, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${color}`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${icon}`}>
        {label === 'Total Teachers' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )}
        {label === 'Submitted' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {label === 'Pending' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {label === 'Overdue' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )}
        {label === 'Completion' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  </motion.div>
);

const CompletionRing = ({ percentage }) => {
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <motion.circle
          stroke={percentage >= 80 ? '#22c55e' : percentage >= 50 ? '#f59e0b' : '#ef4444'}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
        <span className="text-3xl font-bold text-gray-900">{Math.round(percentage)}%</span>
        <span className="text-xs text-gray-500">Complete</span>
      </div>
    </div>
  );
};

const TeacherRow = ({ teacher }) => (
  <tr className="hover:bg-gray-50 transition-colors">
    <td className="px-4 py-3">
      <div className="font-medium text-gray-900">{teacher.name}</div>
    </td>
    <td className="px-4 py-3 text-sm">{teacher.total_classes}</td>
    <td className="px-4 py-3 text-sm text-green-600">{teacher.submitted}</td>
    <td className="px-4 py-3 text-sm text-amber-600">{teacher.pending}</td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-16 bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${
              teacher.completion_percentage >= 80 ? 'bg-green-500' :
              teacher.completion_percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${teacher.completion_percentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{teacher.completion_percentage}%</span>
      </div>
    </td>
    <td className="px-4 py-3 text-xs text-gray-500">
      {teacher.last_submission ? new Date(teacher.last_submission).toLocaleDateString() : 'N/A'}
    </td>
  </tr>
);

export default function AdminGradeMonitoring() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({ status: 'all' });
  const [selectedTeachers, setSelectedTeachers] = useState([]);

  const fetchMonitoring = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/grade-submissions/admin_monitoring/');
      setData(res.data);
    } catch {
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMonitoring(); }, [fetchMonitoring]);

  const handleBulkApprove = async () => {
    if (selectedTeachers.length === 0) {
      toast.error('No submissions selected');
      return;
    }
    try {
      const res = await api.post('/grade-submissions/bulk_approve/', {
        submission_ids: selectedTeachers,
      });
      toast.success(`Approved ${res.data.approved} submissions`);
      setSelectedTeachers([]);
      fetchMonitoring();
    } catch {
      toast.error('Failed to bulk approve');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/grade-submissions/export_submissions/', {
        params: { grading_period: 'current' },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'grade_submissions.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Failed to export');
    }
  };

  const filteredTeachers = data?.teacher_details?.filter(t => {
    if (filters.status === 'submitted' && t.submitted === 0) return false;
    if (filters.status === 'pending' && t.pending === 0) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grade Submission Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor teacher grade submissions and completion</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedTeachers.length > 0 && (
            <Button onClick={handleBulkApprove} className="bg-green-600 hover:bg-green-700 text-white">
              Approve Selected ({selectedTeachers.length})
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : !data ? (
        <EmptyState
          title="No Data Available"
          description="No active grading period found. Create one to start monitoring."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatTile label="Total Teachers" value={data.total_teachers} color="border-l-4 border-l-brand-400" icon="bg-brand-100 text-brand-600" />
            <StatTile label="Submitted" value={data.submitted_teachers} color="border-l-4 border-l-green-400" icon="bg-green-100 text-green-600" />
            <StatTile label="Pending" value={data.pending_teachers} color="border-l-4 border-l-amber-400" icon="bg-amber-100 text-amber-600" />
            <StatTile label="Overdue" value={data.overdue_teachers} color="border-l-4 border-l-red-400" icon="bg-red-100 text-red-600" />
            <StatTile label="Completion" value={`${data.completion_percentage}%`} color="border-l-4 border-l-purple-400" icon="bg-purple-100 text-purple-600" />
          </div>

          <div className="flex items-center gap-2 border-b border-gray-200">
            {['overview', 'teachers', 'charts'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Submission Progress</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center justify-center py-8">
                    <div className="relative">
                      <CompletionRing percentage={data.completion_percentage} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-600">{data.submitted_teachers}</p>
                      <p className="text-xs text-gray-500">Submitted</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-600">{data.pending_teachers}</p>
                      <p className="text-xs text-gray-500">Pending</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">{data.overdue_teachers}</p>
                      <p className="text-xs text-gray-500">Overdue</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {data.daily_submissions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Submissions</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.daily_submissions}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'teachers' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Teacher Submissions</CardTitle>
                  <FormSelect
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="pending">Pending</option>
                  </FormSelect>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classes</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Submission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTeachers.map((teacher) => (
                        <TeacherRow key={teacher.id} teacher={teacher} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}

          {activeTab === 'charts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Grade Level Progress</CardTitle></CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.by_grade_level}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="submitted" fill="#22c55e" name="Submitted" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <Card>
                <CardHeader><CardTitle>Submission Status Distribution</CardTitle></CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Submitted', value: data.submitted_teachers },
                          { name: 'Pending', value: data.pending_teachers },
                          { name: 'Overdue', value: data.overdue_teachers },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
