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
  EmptyState,
} from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  BookOpen,
  CheckCircle,
  Send,
  FileText,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const featureCards = [
  {
    title: 'My Grades',
    description: 'View your grades and academic performance',
    icon: BookOpen,
    link: '/my-classes?view=grades',
    color: 'bg-blue-500',
  },
  {
    title: 'My Attendance',
    description: 'Track your attendance record',
    icon: CheckCircle,
    link: '/student-attendance',
    color: 'bg-green-500',
  },
  {
    title: 'My Schedule',
    description: 'View your class schedule',
    icon: Clock,
    link: '/my-schedule',
    color: 'bg-purple-500',
  },
  {
    title: 'Assignments',
    description: 'View and submit assignments',
    icon: FileText,
    link: '/my-classes',
    color: 'bg-orange-500',
  },
  {
    title: 'Announcements',
    description: 'School announcements and updates',
    icon: Send,
    link: '/announcements',
    color: 'bg-pink-500',
  },
  {
    title: 'My Progress',
    description: 'Academic progress overview',
    icon: Calendar,
    link: '/my-classes',
    color: 'bg-indigo-500',
  },
];

export default function StudentPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [grades, setGrades] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [showCertRequest, setShowCertRequest] = useState(false);
  const [certForm, setCertForm] = useState({ type: 'character', purpose: '' });
  const [loading, setLoading] = useState(true);
  const [submittingCert, setSubmittingCert] = useState(false);
  const [downloadingSf9, setDownloadingSf9] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, gradesRes, notifRes] = await Promise.allSettled([
        api.get('/student/dashboard/stats/'),
        api.get('/grades/my_grades/'),
        api.get('/notifications/?limit=5'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (gradesRes.status === 'fulfilled') setGrades(gradesRes.value.data.results || gradesRes.value.data);
      if (notifRes.status === 'fulfilled') setRecentNotifications(notifRes.value.data.results || notifRes.value.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSf9 = async () => {
    setDownloadingSf9(true);
    try {
      const res = await api.get('/grade-reports/my_reports/', { params: { report_type: 'SF9' } });
      const reports = res.data.results || res.data;

      if (reports.length > 0 && reports[0].file_url) {
        window.open(reports[0].file_url, '_blank');
        toast.success('SF9 report card opened');
      } else {
        const genRes = await api.post('/grade-reports/generate/', {
          report_type: 'SF9',
        });
        if (genRes.data.file_url) {
          window.open(genRes.data.file_url, '_blank');
        }
        toast.success('SF9 report generated');
      }
    } catch {
      toast.error('Failed to download SF9 report');
    } finally {
      setDownloadingSf9(false);
    }
  };

  const handleSubmitCertRequest = async (e) => {
    e.preventDefault();
    if (!certForm.purpose.trim()) {
      toast.error('Please enter a purpose');
      return;
    }
    setSubmittingCert(true);
    try {
      await api.post('/record-requests/', {
        request_type: `${certForm.type}_certificate`,
        purpose: certForm.purpose,
      });
      toast.success('Certificate request submitted');
      setShowCertRequest(false);
      setCertForm({ type: 'character', purpose: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmittingCert(false);
    }
  };

  const getSubjectAverages = () => {
    if (!grades.length) return [];
    const subjectMap = {};
    grades.forEach((grade) => {
      const name = grade.subject_name || grade.subject?.name || 'Unknown';
      if (!subjectMap[name]) subjectMap[name] = { total: 0, count: 0 };
      subjectMap[name].total += grade.grade || grade.final_grade || 0;
      subjectMap[name].count += 1;
    });
    return Object.entries(subjectMap).map(([name, data]) => ({
      name,
      average: Math.round(data.total / data.count),
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const subjectAverages = getSubjectAverages();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Portal</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.first_name || 'Student'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardBody className="py-4">
            <div className="text-sm opacity-90">Overall Average</div>
            <div className="text-3xl font-bold mt-1">{stats?.overall_average ?? 'N/A'}</div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardBody className="py-4">
            <div className="text-sm opacity-90">Attendance Rate</div>
            <div className="text-3xl font-bold mt-1">{stats?.attendance_rate ?? 'N/A'}%</div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardBody className="py-4">
            <div className="text-sm opacity-90">Pending Assignments</div>
            <div className="text-3xl font-bold mt-1">{stats?.pending_assignments ?? 0}</div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {featureCards.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(feature.link)}
            >
              <CardBody className="py-5">
                <div className={`w-10 h-10 rounded-lg ${feature.color} flex items-center justify-center mb-3`}>
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Academic Progress</CardTitle>
            </CardHeader>
            <CardBody>
              {subjectAverages.length === 0 ? (
                <p className="text-sm text-gray-500">No grade data available yet.</p>
              ) : (
                <div className="space-y-3">
                  {subjectAverages.map((subject) => (
                    <div key={subject.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{subject.name}</span>
                        <span className="text-gray-500">{subject.average}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            subject.average >= 90
                              ? 'bg-green-500'
                              : subject.average >= 75
                              ? 'bg-blue-500'
                              : subject.average >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(subject.average, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardBody>
                <Button
                  className="w-full"
                  onClick={handleDownloadSf9}
                  disabled={downloadingSf9}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {downloadingSf9 ? 'Generating...' : 'Download SF9'}
                </Button>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setShowCertRequest(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Request Certificate
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Notifications</CardTitle>
            </CardHeader>
            <CardBody>
              {recentNotifications.length === 0 ? (
                <p className="text-sm text-gray-500">No recent notifications.</p>
              ) : (
                <div className="space-y-3">
                  {recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <p className="font-medium text-gray-800">{notif.title}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {showCertRequest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCertRequest(false);
              setCertForm({ type: 'character', purpose: '' });
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-xl w-full max-w-md"
          >
            <form onSubmit={handleSubmitCertRequest}>
              <div className="border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Request Certificate</h2>
                <button
                  type="button"
                  onClick={() => setShowCertRequest(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-xl">&times;</span>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certificate Type
                  </label>
                  <select
                    value={certForm.type}
                    onChange={(e) => setCertForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 text-sm"
                  >
                    <option value="character">Character Certificate</option>
                    <option value="transfer">Transfer Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                  <textarea
                    value={certForm.purpose}
                    onChange={(e) => setCertForm((p) => ({ ...p, purpose: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 text-sm"
                    rows={3}
                    placeholder="Purpose for requesting this certificate..."
                    required
                  />
                </div>
              </div>
              <div className="border-t px-6 py-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCertRequest(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingCert}>
                  {submittingCert ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
