import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Card, CardHeader, CardBody, CardTitle,
  Button, Badge, Skeleton, EmptyState,
  Input, Select,
} from '../components/ui';
import toast from 'react-hot-toast';
import {
  FileText, BarChart3,
  ChevronRight, AlertTriangle, Trophy,
} from 'lucide-react';

const StudentQuizzes = () => {
  const navigate = useNavigate();
  useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [subjects, setSubjects] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [quizRes, subjectRes] = await Promise.all([
        api.get('/quizzes/'),
        api.get('/subjects/'),
      ]);
      setQuizzes(quizRes.data?.results || quizRes.data || []);
      setSubjects(subjectRes.data?.results || subjectRes.data || []);
    } catch {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredQuizzes = quizzes.filter((q) => {
    const matchSearch = !search || q.title?.toLowerCase().includes(search.toLowerCase());
    const matchSubject = !filterSubject || String(q.subject) === filterSubject;
    const matchStatus = !filterStatus || q.status === filterStatus;
    return matchSearch && matchSubject && matchStatus;
  });

  const getStatusBadge = (quiz) => {
    if (quiz.student_has_attempted) {
      const score = quiz.student_best_score;
      if (score != null) {
        const passed = quiz.passing_score != null ? score >= quiz.passing_score : null;
        return (
          <Badge variant={passed === true ? 'success' : passed === false ? 'danger' : 'info'} size="sm" dot>
            {passed === true ? 'Passed' : passed === false ? 'Failed' : 'Completed'} — {score}%
          </Badge>
        );
      }
      return <Badge variant="info" size="sm" dot>Completed</Badge>;
    }

    const statusMap = {
      active: { variant: 'success', label: 'Available Now' },
      published: { variant: 'warning', label: 'Upcoming' },
      closed: { variant: 'danger', label: 'Closed' },
    };
    const cfg = statusMap[quiz.status] || { variant: 'slate', label: quiz.status };
    return <Badge variant={cfg.variant} size="sm" dot>{cfg.label}</Badge>;
  };

  const getTimeInfo = (quiz) => {
    if (quiz.time_limit_minutes) {
      return `${quiz.time_limit_minutes} min`;
    }
    return 'No limit';
  };

  const getQuizTypeLabel = (quiz) => {
    if (quiz.grade_component) {
      const labels = {
        quiz: 'Quiz', exam: 'Exam', activity: 'Activity',
        written_work: 'Written Work', performance_task: 'Performance Task',
        quarterly_assessment: 'Quarterly Assessment',
      };
      return labels[quiz.grade_component] || quiz.grade_component;
    }
    return 'Quiz';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="p-4 border-b border-slate-100 space-y-2">
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
              <div className="p-4 space-y-3">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-2/3 rounded" />
                <Skeleton className="h-8 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto px-4 py-6 space-y-6"
    >
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
          <BarChart3 className="w-4 h-4" />
          <span>Assessments</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Quizzes
        </h1>
        <p className="text-xs text-slate-600 mt-1 font-semibold">
          View and take your assigned quizzes and exams
        </p>
      </div>

      <Card>
        <CardBody className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Input
                placeholder="Search quizzes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Available Now</option>
              <option value="published">Upcoming</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      {filteredQuizzes.length === 0 ? (
        <Card>
          <CardBody className="p-12">
            <EmptyState
              title="No Quizzes Found"
              description={search || filterSubject || filterStatus
                ? 'Try adjusting your filters'
                : 'No quizzes have been assigned to you yet'}
              icon={<FileText className="w-6 h-6" />}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-all border-l-4 border-l-blue-500 h-full flex flex-col">
                <CardHeader divider className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{quiz.title}</CardTitle>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {quiz.description || 'No description'}
                      </p>
                    </div>
                    {getStatusBadge(quiz)}
                  </div>
                </CardHeader>
                <CardBody className="flex flex-col">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="blue" size="sm">{getQuizTypeLabel(quiz)}</Badge>
                      {quiz.subject_name && (
                        <Badge variant="slate" size="sm">{quiz.subject_name}</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                      <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-slate-500">Questions</p>
                        <p className="font-bold text-slate-900">{quiz.question_count ?? 0}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-slate-500">Points</p>
                        <p className="font-bold text-slate-900">{quiz.total_points ?? 0}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-slate-500">Time</p>
                        <p className="font-bold text-slate-900">{getTimeInfo(quiz)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-slate-500">Attempts</p>
                        <p className="font-bold text-slate-900">
                          {quiz.student_attempts_used ?? 0}/{quiz.max_attempts}
                        </p>
                      </div>
                    </div>

                    {quiz.passing_score != null && (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Passing score: {quiz.passing_score}%</span>
                      </div>
                    )}

                    {quiz.student_best_score != null && (
                      <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 rounded-lg p-2">
                        <Trophy className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Best score: {quiz.student_best_score}%</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3">
                    <Button
                      onClick={() => navigate(`/quizzes/take/${quiz.id}`)}
                      disabled={quiz.status === 'closed' || (quiz.student_attempts_used != null && quiz.student_attempts_used >= quiz.max_attempts)}
                      className="w-full"
                      size="sm"
                      variant={quiz.student_has_attempted ? 'secondary' : 'primary'}
                    >
                      {quiz.student_has_attempted ? (
                        <>
                          <BarChart3 className="w-3.5 h-3.5 mr-1" /> View Results
                        </>
                      ) : quiz.status === 'closed' ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Closed
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3.5 h-3.5 mr-1" /> Take Quiz
                        </>
                      )}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default StudentQuizzes;