import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button, Badge,
  LoadingSpinner, EmptyState,
} from '../../components/ui';
import {
  Plus, Trash2, Clock, CheckCircle, XCircle,
  FileText, Users, BarChart3, HelpCircle, Send,
  Eye, Edit2, Search, ChevronRight, Calendar,
  BookOpen, Clipboard,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ── Quizzes Tab ──────────────────────────────────────────────────────────────
export const QuizzesView = ({ classroom, onNavigate }) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchQuizzes();
  }, [classroom.id]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quizzes/', { params: { classroom: classroom.id } });
      setQuizzes(res.data?.results || res.data || []);
    } catch {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return quizzes;
    const q = search.toLowerCase();
    return quizzes.filter(z => z.title?.toLowerCase().includes(q));
  }, [quizzes, search]);

  const handlePublish = async (quizId, publish) => {
    try {
      await api.post(`/quizzes/${quizId}/${publish ? 'publish' : 'unpublish'}/`);
      fetchQuizzes();
      toast.success(publish ? 'Quiz published' : 'Quiz unpublished');
    } catch {
      toast.error('Failed to update quiz');
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this quiz?')) return;
    try {
      await api.delete(`/quizzes/${quizId}/`);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      toast.success('Quiz deleted');
    } catch {
      toast.error('Failed to delete quiz');
    }
  };

  const statusBadge = (status) => {
    const map = {
      draft: { variant: 'slate', label: 'Draft' },
      published: { variant: 'green', label: 'Published' },
      archived: { variant: 'blue', label: 'Archived' },
    };
    const cfg = map[status] || map.draft;
    return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quizzes..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs"
          />
        </div>
        <Button variant="primary" size="sm" className="text-[10px] px-2 py-1"
          onClick={() => onNavigate?.('quizzes')}>
          <Plus className="w-3 h-3 mr-1" /> New Quiz
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <Card><CardBody className="p-6">
          <EmptyState title="No Quizzes" description="Create your first quiz for this class"
            icon={<HelpCircle className="w-6 h-6" />} />
        </CardBody></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(quiz => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
              <CardBody className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{quiz.title}</h3>
                      {statusBadge(quiz.status)}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{quiz.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-500">
                      <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{quiz.question_count || 0} Q</span>
                      <span className="flex items-center gap-0.5"><BarChart3 className="w-2.5 h-2.5" />{quiz.total_points || 0} pts</span>
                      {quiz.time_limit_minutes && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{quiz.time_limit_minutes}m</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {quiz.status === 'draft' ? (
                      <Button variant="ghost" size="sm" className="text-[9px] text-green-600"
                        onClick={() => handlePublish(quiz.id, true)}>
                        <CheckCircle className="w-3 h-3 mr-0.5" /> Publish
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-[9px] text-amber-600"
                        onClick={() => handlePublish(quiz.id, false)}>
                        <XCircle className="w-3 h-3 mr-0.5" /> Unpublish
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-[9px] text-red-500"
                      onClick={() => handleDelete(quiz.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Lesson Plans Tab ─────────────────────────────────────────────────────────
export const LessonPlansView = ({ classroom, onNavigate }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPlans();
  }, [classroom.id]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/lesson-plans/', { params: { classroom: classroom.id } });
      setPlans(res.data?.results || res.data || []);
    } catch {
      toast.error('Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = plans.filter(p => {
      if (activeTab === 'daily') return p.plan_type !== 'weekly';
      return p.plan_type === 'weekly';
    });
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title?.toLowerCase().includes(q));
    }
    return list;
  }, [plans, activeTab, search]);

  const handleSubmit = async (planId) => {
    try {
      await api.post(`/lesson-plans/${planId}/submit_for_review/`);
      fetchPlans();
      toast.success('Lesson plan submitted for review');
    } catch {
      toast.error('Failed to submit');
    }
  };

  const handleApprove = async (planId) => {
    try {
      await api.post(`/lesson-plans/${planId}/approve/`);
      fetchPlans();
      toast.success('Lesson plan approved');
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Delete this lesson plan?')) return;
    try {
      await api.delete(`/lesson-plans/${planId}/`);
      setPlans(prev => prev.filter(p => p.id !== planId));
      toast.success('Lesson plan deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const statusBadge = (status) => {
    const map = {
      draft: { variant: 'slate', label: 'Draft' },
      submitted: { variant: 'blue', label: 'Submitted' },
      approved: { variant: 'green', label: 'Approved' },
      revision_needed: { variant: 'amber', label: 'Revision' },
    };
    const cfg = map[status] || map.draft;
    return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
        {[{ id: 'daily', label: 'Daily' }, { id: 'weekly', label: 'Weekly' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-1.5 text-[10px] font-semibold rounded-md transition-colors ${
              activeTab === tab.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>{tab.label}</button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs" />
        </div>
        <Button variant="primary" size="sm" className="text-[10px] px-2 py-1"
          onClick={() => onNavigate?.('lesson-plans')}>
          <Plus className="w-3 h-3 mr-1" /> New Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <Card><CardBody className="p-6">
          <EmptyState title="No Lesson Plans" description="Create your first lesson plan"
            icon={<FileText className="w-6 h-6" />} />
        </CardBody></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(plan => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardBody className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{plan.title}</h3>
                      {statusBadge(plan.status)}
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-slate-500">
                      <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{plan.date || 'No date'}</span>
                      <span className="flex items-center gap-0.5"><BookOpen className="w-2.5 h-2.5" />{plan.subject_name || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {plan.status === 'draft' && (
                      <Button variant="ghost" size="sm" className="text-[9px] text-blue-600"
                        onClick={() => handleSubmit(plan.id)}>
                        <Send className="w-3 h-3 mr-0.5" /> Submit
                      </Button>
                    )}
                    {plan.status === 'submitted' && user?.role === 'admin' && (
                      <Button variant="ghost" size="sm" className="text-[9px] text-green-600"
                        onClick={() => handleApprove(plan.id)}>
                        <CheckCircle className="w-3 h-3 mr-0.5" /> Approve
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-[9px] text-red-500"
                      onClick={() => handleDelete(plan.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Analytics Tab ────────────────────────────────────────────────────────────
export const ClassroomAnalyticsView = ({ classroom }) => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quarter, setQuarter] = useState('');

  useEffect(() => {
    fetchGrades();
  }, [classroom.id, quarter]);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const params = { classroom: classroom.id, grade_type: 'final_grade' };
      if (quarter) params.quarter = quarter;
      const res = await api.get('/grades/', { params });
      setGrades(res.data?.results || res.data || []);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!grades.length) return null;
    const scores = grades.map(g => parseFloat(g.raw_score)).filter(s => !isNaN(s));
    if (!scores.length) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passing = scores.filter(s => s >= 75).length;
    const atRisk = scores.filter(s => s < 75).length;
    const distribution = {
      'Outstanding (90-100)': scores.filter(s => s >= 90).length,
      'Very Satisfactory (85-89)': scores.filter(s => s >= 85 && s < 90).length,
      'Satisfactory (80-84)': scores.filter(s => s >= 80 && s < 85).length,
      'Fairly Satisfactory (75-79)': scores.filter(s => s >= 75 && s < 80).length,
      'Did Not Meet (Below 75)': scores.filter(s => s < 75).length,
    };
    return { avg: avg.toFixed(1), passing, atRisk, total: scores.length, distribution,
      highest: Math.max(...scores), lowest: Math.min(...scores) };
  }, [grades]);

  const chartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.distribution).map(([name, value]) => ({ name: name.split(' ')[0], value }));
  }, [stats]);

  const COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

  if (loading) return <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>;
  if (!stats) return (
    <Card><CardBody className="p-6">
      <EmptyState title="No Grade Data" description="No grades recorded for this class yet"
        icon={<BarChart3 className="w-6 h-6" />} />
    </CardBody></Card>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <select value={quarter} onChange={(e) => setQuarter(e.target.value)}
          className="px-2 py-1 rounded-lg border border-slate-200 text-[10px] focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="">All Terms</option>
          <option value="1">Term 1</option>
          <option value="2">Term 2</option>
          <option value="3">Term 3</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Average', value: stats.avg, color: 'text-violet-700 bg-violet-50 border-violet-200' },
          { label: 'Passing', value: stats.passing, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'At Risk', value: stats.atRisk, color: 'text-rose-700 bg-rose-50 border-rose-200' },
          { label: 'Highest', value: stats.highest, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        ].map(s => (
          <div key={s.label} className={`border rounded-lg p-2 text-center ${s.color}`}>
            <p className="text-sm font-black">{s.value}</p>
            <p className="text-[8px] font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-xs">Grade Distribution</CardTitle></CardHeader>
          <CardBody className="p-3">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

// ── Question Bank Tab ────────────────────────────────────────────────────────
export const QuestionBankView = ({ classroom, onNavigate }) => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBanks();
  }, [classroom.id]);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/question-banks/');
      setBanks(res.data?.results || res.data || []);
    } catch {
      toast.error('Failed to load question banks');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return banks;
    const q = search.toLowerCase();
    return banks.filter(b => b.name?.toLowerCase().includes(q));
  }, [banks, search]);

  const handleDelete = async (bankId) => {
    if (!window.confirm('Delete this question bank?')) return;
    try {
      await api.delete(`/question-banks/${bankId}/`);
      setBanks(prev => prev.filter(b => b.id !== bankId));
      toast.success('Question bank deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search banks..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs" />
        </div>
        <Button variant="primary" size="sm" className="text-[10px] px-2 py-1"
          onClick={() => onNavigate?.('question-bank')}>
          <Plus className="w-3 h-3 mr-1" /> New Bank
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <Card><CardBody className="p-6">
          <EmptyState title="No Question Banks" description="Create a question bank to get started"
            icon={<Clipboard className="w-6 h-6" />} />
        </CardBody></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(bank => (
            <Card key={bank.id} className="hover:shadow-md transition-shadow">
              <CardBody className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate">{bank.name}</h3>
                    <p className="text-[10px] text-slate-500">{bank.question_count || 0} questions</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[9px] text-red-500"
                    onClick={() => handleDelete(bank.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
