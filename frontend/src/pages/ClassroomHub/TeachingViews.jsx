import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button, Badge,
  LoadingSpinner, EmptyState,
} from '../../components/ui';
import Modal, { ModalBody, ModalFooter, ModalBtnPrimary, ModalBtnSecondary, modalInputCls } from '../../components/ui/Modal';
import {
  Plus, Trash2, Clock, CheckCircle, XCircle,
  FileText, Users, BarChart3, HelpCircle, Send,
  Search, Calendar, BookOpen, Clipboard, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

// ── Quizzes Tab ──────────────────────────────────────────────────────────────
export const QuizzesView = ({ classroom }) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', subject: '', time_limit_minutes: '', grade_component: 'quiz' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchQuizzes(); fetchSubjects(); }, [classroom.id]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quizzes/', { params: { classroom: classroom.id } });
      setQuizzes(res.data?.results || res.data || []);
    } catch { toast.error('Failed to load quizzes'); }
    finally { setLoading(false); }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get(`/classroom-subjects/by_classroom/?classroom_id=${classroom.id}`);
      setSubjects(res.data || []);
    } catch { /* silent */ }
  };

  const filtered = useMemo(() => {
    if (!search) return quizzes;
    const q = search.toLowerCase();
    return quizzes.filter(z => z.title?.toLowerCase().includes(q));
  }, [quizzes, search]);

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.subject) return toast.error('Select a subject');
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        classroom: classroom.id,
        subject: parseInt(form.subject, 10),
        time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes, 10) : null,
        grade_component: form.grade_component,
      };
      await api.post('/quizzes/', payload);
      setShowCreate(false);
      setForm({ title: '', description: '', subject: '', time_limit_minutes: '', grade_component: 'quiz' });
      fetchQuizzes();
      toast.success('Quiz created');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create quiz');
    } finally { setSaving(false); }
  };

  const handlePublish = async (quizId, publish) => {
    try {
      await api.post(`/quizzes/${quizId}/${publish ? 'publish' : 'unpublish'}/`);
      fetchQuizzes();
      toast.success(publish ? 'Quiz published' : 'Quiz unpublished');
    } catch { toast.error('Failed to update quiz'); }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this quiz?')) return;
    try {
      await api.delete(`/quizzes/${quizId}/`);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      toast.success('Quiz deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const statusBadge = (status) => {
    const cfg = { draft: { v: 'slate', l: 'Draft' }, published: { v: 'green', l: 'Published' }, archived: { v: 'blue', l: 'Archived' } }[status] || { v: 'slate', l: status };
    return <Badge variant={cfg.v} size="sm">{cfg.l}</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quizzes..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs" />
        </div>
        <Button variant="primary" size="sm" className="text-[10px] px-2 py-1" onClick={() => setShowCreate(true)}>
          <Plus className="w-3 h-3 mr-1" /> New Quiz
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <Card><CardBody className="p-6">
          <EmptyState title="No Quizzes" description="Create your first quiz for this class" icon={<HelpCircle className="w-6 h-6" />} />
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} size="md">
        <ModalBody>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Create Quiz</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={modalInputCls + ' text-xs py-1.5'} placeholder="Quiz title" />
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={modalInputCls + ' text-xs'} rows={2} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Subject *</label>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={modalInputCls + ' text-xs py-1.5'}>
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.subject}>{s.subject_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Component</label>
                <select value={form.grade_component} onChange={(e) => setForm({ ...form, grade_component: e.target.value })}
                  className={modalInputCls + ' text-xs py-1.5'}>
                  <option value="quiz">Quiz</option>
                  <option value="exam">Exam</option>
                  <option value="activity">Activity</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Time Limit (minutes)</label>
              <input type="number" min="1" value={form.time_limit_minutes}
                onChange={(e) => setForm({ ...form, time_limit_minutes: e.target.value })}
                className={modalInputCls + ' text-xs py-1.5'} placeholder="Optional" />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setShowCreate(false)} className="text-[10px]">Cancel</ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleCreate} loading={saving} disabled={!form.title.trim() || !form.subject}
            className="text-[10px]">Create</ModalBtnPrimary>
        </ModalFooter>
      </Modal>
    </div>
  );
};

// ── Lesson Plans Tab ─────────────────────────────────────────────────────────
export const LessonPlansView = ({ classroom }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ title: '', plan_type: 'dlp', subject: '', date: '', quarter: 1, objectives: '', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPlans(); fetchSubjects(); }, [classroom.id]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/lesson-plans/', { params: { classroom: classroom.id } });
      setPlans(res.data?.results || res.data || []);
    } catch { toast.error('Failed to load lesson plans'); }
    finally { setLoading(false); }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get(`/classroom-subjects/by_classroom/?classroom_id=${classroom.id}`);
      setSubjects(res.data || []);
    } catch { /* silent */ }
  };

  const filtered = useMemo(() => {
    let list = plans.filter(p => activeTab === 'daily' ? p.plan_type !== 'weekly' : p.plan_type === 'weekly');
    if (search) { const q = search.toLowerCase(); list = list.filter(p => p.title?.toLowerCase().includes(q)); }
    return list;
  }, [plans, activeTab, search]);

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.subject) return toast.error('Select a subject');
    if (!form.date) return toast.error('Date is required');
    setSaving(true);
    try {
      await api.post('/lesson-plans/', {
        title: form.title.trim(),
        plan_type: form.plan_type,
        classroom: classroom.id,
        subject: parseInt(form.subject, 10),
        date: form.date,
        quarter: form.quarter,
        objectives: form.objectives.trim(),
        content: form.content.trim(),
      });
      setShowCreate(false);
      setForm({ title: '', plan_type: 'dlp', subject: '', date: '', quarter: 1, objectives: '', content: '' });
      fetchPlans();
      toast.success('Lesson plan created');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create lesson plan');
    } finally { setSaving(false); }
  };

  const handleSubmit = async (planId) => {
    try { await api.post(`/lesson-plans/${planId}/submit_for_review/`); fetchPlans(); toast.success('Submitted for review'); }
    catch { toast.error('Failed to submit'); }
  };

  const handleApprove = async (planId) => {
    try { await api.post(`/lesson-plans/${planId}/approve/`); fetchPlans(); toast.success('Approved'); }
    catch { toast.error('Failed to approve'); }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Delete this lesson plan?')) return;
    try { await api.delete(`/lesson-plans/${planId}/`); setPlans(prev => prev.filter(p => p.id !== planId)); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const statusBadge = (status) => {
    const cfg = { draft: { v: 'slate', l: 'Draft' }, submitted: { v: 'blue', l: 'Submitted' }, approved: { v: 'green', l: 'Approved' }, revision_needed: { v: 'amber', l: 'Revision' } }[status] || { v: 'slate', l: status };
    return <Badge variant={cfg.v} size="sm">{cfg.l}</Badge>;
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
        <Button variant="primary" size="sm" className="text-[10px] px-2 py-1" onClick={() => setShowCreate(true)}>
          <Plus className="w-3 h-3 mr-1" /> New Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <Card><CardBody className="p-6">
          <EmptyState title="No Lesson Plans" description="Create your first lesson plan" icon={<FileText className="w-6 h-6" />} />
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
                      <Button variant="ghost" size="sm" className="text-[9px] text-blue-600" onClick={() => handleSubmit(plan.id)}>
                        <Send className="w-3 h-3 mr-0.5" /> Submit
                      </Button>
                    )}
                    {plan.status === 'submitted' && (user?.role === 'admin' || user?.role === 'staff') && (
                      <Button variant="ghost" size="sm" className="text-[9px] text-green-600" onClick={() => handleApprove(plan.id)}>
                        <CheckCircle className="w-3 h-3 mr-0.5" /> Approve
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-[9px] text-red-500" onClick={() => handleDelete(plan.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} size="md">
        <ModalBody>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Create Lesson Plan</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={modalInputCls + ' text-xs py-1.5'} placeholder="Lesson plan title" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Type</label>
                <select value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })}
                  className={modalInputCls + ' text-xs py-1.5'}>
                  <option value="dlp">Daily Lesson Plan</option>
                  <option value="dll">Daily Lesson Log</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Subject *</label>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={modalInputCls + ' text-xs py-1.5'}>
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.subject}>{s.subject_name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Date *</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={modalInputCls + ' text-xs py-1.5'} />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Term</label>
                <select value={form.quarter} onChange={(e) => setForm({ ...form, quarter: parseInt(e.target.value) })}
                  className={modalInputCls + ' text-xs py-1.5'}>
                  <option value={1}>Term 1</option>
                  <option value={2}>Term 2</option>
                  <option value={3}>Term 3</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Objectives</label>
              <textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })}
                className={modalInputCls + ' text-xs'} rows={2} placeholder="Learning objectives" />
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Content / Topic</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                className={modalInputCls + ' text-xs'} rows={2} placeholder="Content or topic" />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setShowCreate(false)} className="text-[10px]">Cancel</ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleCreate} loading={saving} disabled={!form.title.trim() || !form.subject || !form.date}
            className="text-[10px]">Create</ModalBtnPrimary>
        </ModalFooter>
      </Modal>
    </div>
  );
};

// ── Analytics Tab ────────────────────────────────────────────────────────────
export const ClassroomAnalyticsView = ({ classroom }) => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quarter, setQuarter] = useState('');

  useEffect(() => { fetchGrades(); }, [classroom.id, quarter]);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const params = { classroom: classroom.id, grade_type: 'final_grade' };
      if (quarter) params.quarter = quarter;
      const res = await api.get('/grades/', { params });
      setGrades(res.data?.results || res.data || []);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  const stats = useMemo(() => {
    if (!grades.length) return null;
    const scores = grades.map(g => parseFloat(g.raw_score)).filter(s => !isNaN(s));
    if (!scores.length) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passing = scores.filter(s => s >= 75).length;
    const atRisk = scores.filter(s => s < 75).length;
    const distribution = {
      'Outstanding': scores.filter(s => s >= 90).length,
      'V. Satisfactory': scores.filter(s => s >= 85 && s < 90).length,
      'Satisfactory': scores.filter(s => s >= 80 && s < 85).length,
      'F. Satisfactory': scores.filter(s => s >= 75 && s < 80).length,
      'DNMIE': scores.filter(s => s < 75).length,
    };
    return { avg: avg.toFixed(1), passing, atRisk, total: scores.length, distribution,
      highest: Math.max(...scores), lowest: Math.min(...scores) };
  }, [grades]);

  const chartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.distribution).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

  if (loading) return <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>;
  if (!stats) return (
    <Card><CardBody className="p-6">
      <EmptyState title="No Grade Data" description="No grades recorded for this class yet" icon={<BarChart3 className="w-6 h-6" />} />
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
                <XAxis dataKey="name" tick={{ fontSize: 8 }} interval={0} angle={-15} textAnchor="end" height={50} />
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
export const QuestionBankView = ({ classroom }) => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBanks(); }, [classroom.id]);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/question-banks/');
      setBanks(res.data?.results || res.data || []);
    } catch { toast.error('Failed to load question banks'); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    if (!search) return banks;
    const q = search.toLowerCase();
    return banks.filter(b => b.name?.toLowerCase().includes(q));
  }, [banks, search]);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await api.post('/question-banks/', {
        name: form.name.trim(),
        description: form.description.trim(),
      });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      fetchBanks();
      toast.success('Question bank created');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create');
    } finally { setSaving(false); }
  };

  const handleDelete = async (bankId) => {
    if (!window.confirm('Delete this question bank?')) return;
    try {
      await api.delete(`/question-banks/${bankId}/`);
      setBanks(prev => prev.filter(b => b.id !== bankId));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
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
        <Button variant="primary" size="sm" className="text-[10px] px-2 py-1" onClick={() => setShowCreate(true)}>
          <Plus className="w-3 h-3 mr-1" /> New Bank
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <Card><CardBody className="p-6">
          <EmptyState title="No Question Banks" description="Create a question bank to get started" icon={<Clipboard className="w-6 h-6" />} />
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} size="md">
        <ModalBody>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Create Question Bank</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={modalInputCls + ' text-xs py-1.5'} placeholder="Bank name" />
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={modalInputCls + ' text-xs'} rows={2} placeholder="Optional description" />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setShowCreate(false)} className="text-[10px]">Cancel</ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleCreate} loading={saving} disabled={!form.name.trim()}
            className="text-[10px]">Create</ModalBtnPrimary>
        </ModalFooter>
      </Modal>
    </div>
  );
};
