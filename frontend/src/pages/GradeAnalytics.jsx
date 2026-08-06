import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  Select,
} from '../components/ui';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';

const QUARTER_OPTIONS = [
  { value: '', label: 'All Terms' },
  { value: 'Q1', label: 'Term 1' },
  { value: 'Q2', label: 'Term 2' },
  { value: 'Q3', label: 'Term 3' },
];

const GRADE_COLORS = {
  Outstanding: '#22c55e',
  'Very Satisfactory': '#84cc16',
  Satisfactory: '#eab308',
  'Fairly Satisfactory': '#f97316',
  DNMIE: '#ef4444',
};

const RISK_BADGE = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-orange-100 text-orange-800 border-orange-200',
};

const RISK_LABEL = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function getBarColor(avg) {
  if (avg >= 85) return '#22c55e';
  if (avg >= 75) return '#eab308';
  return '#ef4444';
}

export default function GradeAnalytics() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [quarterlyTrend, setQuarterlyTrend] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({
    classroom: '',
    subject: '',
    quarter: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (filters.classroom) {
      fetchAnalytics();
    }
  }, [filters]);

  async function fetchDropdowns() {
    try {
      const [classRes, subjectRes] = await Promise.all([
        api.get('/teacher/classrooms/'),
        api.get('/teacher/subjects/'),
      ]);
      setClassrooms(classRes.data);
      setSubjects(subjectRes.data);
      if (classRes.data.length > 0) {
        setFilters((f) => ({ ...f, classroom: classRes.data[0].id }));
      }
    } catch {
      toast.error('Failed to load filters');
    }
  }

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const params = {};
      if (filters.classroom) params.classroom = filters.classroom;
      if (filters.subject) params.subject = filters.subject;
      if (filters.quarter) params.quarter = filters.quarter;

      const [statsRes, summaryRes, atRiskRes, quarterlyRes] =
        await Promise.all([
          api.get('/teacher/stats/', { params }),
          api.get('/grades/summary/', { params }),
          api.get('/grades/at-risk/', { params }),
          api.get('/grades/quarterly-trend/', { params }),
        ]);

      setStats(statsRes.data);
      setSubjectPerformance(summaryRes.data.subject_performance ?? []);
      setGradeDistribution(summaryRes.data.grade_distribution ?? []);
      setAtRiskStudents(atRiskRes.data ?? []);
      setQuarterlyTrend(quarterlyRes.data ?? []);
    } catch {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const classAvg = stats?.class_average ?? 0;
  const passingRate = stats?.passing_rate ?? 0;
  const atRiskCount = atRiskStudents.length;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header & Filters */}
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Grade Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Performance insights for your classes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filters.classroom}
            onChange={(e) => updateFilter('classroom', e.target.value)}
            className="w-48"
          >
            <option value="">Select Classroom</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={filters.subject}
            onChange={(e) => updateFilter('subject', e.target.value)}
            className="w-44"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            value={filters.quarter}
            onChange={(e) => updateFilter('quarter', e.target.value)}
            className="w-40"
          >
            {QUARTER_OPTIONS.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </Select>
        </div>
      </motion.div>

      {/* Overview Cards */}
      <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardBody className="p-3 sm:p-6">
                  <Skeleton className="h-20 w-full" />
                </CardBody>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              icon={<Users className="h-5 w-5 text-blue-500" />}
              label="Total Students"
              value={stats?.total_students ?? 0}
              accent="bg-blue-50 dark:bg-blue-900/20"
            />
            <StatCard
              icon={<BarChart3 className="h-5 w-5 text-emerald-500" />}
              label="Class Average"
              value={classAvg.toFixed(1)}
              accent="bg-emerald-50 dark:bg-emerald-900/20"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
              label="Passing Rate"
              value={`${passingRate.toFixed(1)}%`}
              accent="bg-purple-50 dark:bg-purple-900/20"
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              label="At-Risk Students"
              value={atRiskCount}
              accent="bg-red-50 dark:bg-red-900/20"
              highlight={atRiskCount > 0}
            />
          </>
        )}
      </motion.div>

      {/* Charts Row: Subject Performance + Grade Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Subject Performance Bar Chart */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
            </CardHeader>
            <CardBody>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : subjectPerformance.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">
                  No subject data available
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={subjectPerformance}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      dataKey="subject"
                      type="category"
                      tick={{ fontSize: 12 }}
                      width={75}
                    />
                    <Tooltip
                      formatter={(v) => [`${v.toFixed(1)}`, 'Average']}
                    />
                    <Bar
                      dataKey="average"
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                    >
                      {subjectPerformance.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={getBarColor(entry.average)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* Grade Distribution Pie Chart */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
            </CardHeader>
            <CardBody>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : gradeDistribution.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">
                  No distribution data available
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={gradeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      dataKey="count"
                      nameKey="label"
                      paddingAngle={3}
                      label={({ label, percent }) =>
                        `${label} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine
                    >
                      {gradeDistribution.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={GRADE_COLORS[entry.label] ?? '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Quarterly Trend Line Chart */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>Class Performance by Quarter</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : quarterlyTrend.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">
                No quarterly data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={quarterlyTrend}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v) => [`${v.toFixed(1)}`, 'Average']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: '#6366f1' }}
                    activeDot={{ r: 7 }}
                  />
                  {quarterlyTrend[0]?.passing_rate !== undefined && (
                    <Line
                      type="monotone"
                      dataKey="passing_rate"
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 4, fill: '#22c55e' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* At-Risk Students Table */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              At-Risk Students
              {atRiskStudents.length > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-700">
                  {atRiskStudents.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="p-3 sm:p-6">
                <Skeleton className="h-48 w-full" />
              </div>
            ) : atRiskStudents.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">
                No at-risk students found
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">Average</th>
                      <th className="px-6 py-3">Failing Subjects</th>
                      <th className="px-6 py-3">Attendance</th>
                      <th className="px-6 py-3">Risk Level</th>
                      <th className="px-6 py-3">Risk Factors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {atRiskStudents.map((s) => (
                      <tr
                        key={s.id}
                        className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() =>
                          toast(`Opening profile for ${s.name}`, {
                            icon: '📋',
                          })
                        }
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {s.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={
                              s.average < 75
                                ? 'font-semibold text-red-600'
                                : 'text-gray-700 dark:text-gray-300'
                            }
                          >
                            {s.average?.toFixed(1) ?? '—'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                          {s.failing_subjects ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                          {s.attendance_rate != null
                            ? `${s.attendance_rate.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                              RISK_BADGE[s.risk_level] ?? RISK_BADGE.low
                            }`}
                          >
                            {RISK_LABEL[s.risk_level] ?? s.risk_level}
                          </span>
                        </td>
                        <td className="max-w-[260px] truncate px-6 py-4 text-gray-500 dark:text-gray-400">
                          {s.risk_factors?.join(', ') ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Performers */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardBody>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : (stats?.top_performers ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No data available
                </p>
              ) : (
                <ol className="space-y-3">
                  {stats.top_performers.slice(0, 5).map((s, i) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-green-50/50 px-4 py-3 dark:border-gray-800 dark:bg-green-900/10"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {s.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {s.subject ?? 'Overall'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {s.average?.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* Struggling Students */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Struggling Students
              </CardTitle>
            </CardHeader>
            <CardBody>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : (stats?.struggling_students ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No data available
                </p>
              ) : (
                <ol className="space-y-3">
                  {stats.struggling_students.slice(0, 5).map((s, i) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-red-50/50 px-4 py-3 dark:border-gray-800 dark:bg-red-900/10"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {s.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {s.suggestion ?? 'Schedule a parent conference & provide supplemental materials'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {s.average?.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, accent, highlight }) {
  return (
    <Card className={highlight ? 'ring-2 ring-red-300 dark:ring-red-700' : ''}>
      <CardBody className="flex items-center gap-4 p-6">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
