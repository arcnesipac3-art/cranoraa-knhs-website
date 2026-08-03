import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button, Badge,
  Skeleton, EmptyState,
} from '../../components/ui';
import Modal, { ModalBody, ModalFooter, ModalBtnPrimary, ModalBtnSecondary, modalInputCls } from '../../components/ui/Modal';
import {
  Plus, Trash2, Clock, CheckCircle, XCircle, Pencil,
  FileText, BarChart3, HelpCircle, Send, Eye,
  Search, Calendar, BookOpen, Play,
  ChevronDown, ChevronRight, Trophy, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

// ── Quiz Management (Teacher) ────────────────────────────────────────────────
export const QuizManagementView = ({ classroom }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [createStep, setCreateStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', subject: '', time_limit_minutes: '',
    grade_component: 'quiz', max_attempts: 1, shuffle_questions: true,
    show_correct_answers: true,
  });
  const [saving, setSaving] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

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

  const QUIZ_TEMPLATES = [
    { id: 'quick', label: 'Quick Quiz', desc: 'Short check-in, 15 min', icon: '⚡', time: 15, attempts: 1, shuffle: true, showAnswers: true },
    { id: 'standard', label: 'Standard Quiz', desc: 'Regular quiz, 30 min', icon: '📝', time: 30, attempts: 1, shuffle: true, showAnswers: true },
    { id: 'exam', label: 'Long Exam', desc: 'Formal exam, 60 min', icon: '📋', time: 60, attempts: 1, shuffle: false, showAnswers: true },
    { id: 'practice', label: 'Practice Quiz', desc: 'No time limit, retakes OK', icon: '🎯', time: null, attempts: 99, shuffle: true, showAnswers: true },
    { id: 'custom', label: 'Custom', desc: 'Set everything yourself', icon: '⚙️', time: null, attempts: 1, shuffle: true, showAnswers: true },
  ];

  const applyTemplate = (tpl) => {
    setSelectedTemplate(tpl.id);
    setForm(prev => ({
      ...prev,
      time_limit_minutes: tpl.time || '',
      max_attempts: tpl.attempts,
      shuffle_questions: tpl.shuffle,
      show_correct_answers: tpl.showAnswers,
    }));
  };

  const openCreateModal = () => {
    setForm({ title: '', description: '', subject: '', time_limit_minutes: '', grade_component: 'quiz', max_attempts: 1, shuffle_questions: true, show_correct_answers: true });
    setSelectedTemplate(null);
    setCreateStep(1);
    setShowCreate(true);
  };

  const filtered = useMemo(() => {
    let list = quizzes;
    if (filter !== 'all') list = list.filter(q => q.status === filter);
    if (search) { const s = search.toLowerCase(); list = list.filter(q => q.title?.toLowerCase().includes(s)); }
    return list;
  }, [quizzes, search, filter]);

  const stats = useMemo(() => ({
    total: quizzes.length,
    draft: quizzes.filter(q => q.status === 'draft').length,
    published: quizzes.filter(q => q.status === 'published').length,
    active: quizzes.filter(q => q.status === 'active').length,
  }), [quizzes]);

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
        max_attempts: parseInt(form.max_attempts, 10) || 1,
        shuffle_questions: form.shuffle_questions,
        show_correct_answers: form.show_correct_answers,
      };
      await api.post('/quizzes/', payload);
      setShowCreate(false);
      setForm({ title: '', description: '', subject: '', time_limit_minutes: '', grade_component: 'quiz', max_attempts: 1, shuffle_questions: false, show_correct_answers: true });
      fetchQuizzes();
      toast.success('Quiz created');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create quiz');
    } finally { setSaving(false); }
  };

  const handlePublish = async (quizId, status) => {
    try {
      await api.post(`/quizzes/${quizId}/publish/`);
      fetchQuizzes();
      toast.success(status === 'draft' ? 'Quiz activated' : 'Quiz updated');
    } catch { toast.error('Failed to update quiz'); }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this quiz and all its data?')) return;
    try {
      await api.delete(`/quizzes/${quizId}/`);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      if (expandedQuiz === quizId) setExpandedQuiz(null);
      toast.success('Quiz deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const loadResults = async (quizId) => {
    setLoadingResults(true);
    try {
      const res = await api.get(`/quizzes/${quizId}/results/`);
      setQuizResults(res.data?.results || res.data || []);
    } catch { toast.error('Failed to load results'); }
    finally { setLoadingResults(false); }
  };

  const statusConfig = {
    draft: { v: 'slate', l: 'Draft', icon: Pencil },
    published: { v: 'green', l: 'Published', icon: CheckCircle },
    active: { v: 'blue', l: 'Active', icon: Zap },
    closed: { v: 'red', l: 'Closed', icon: XCircle },
  };

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700 bg-slate-50 border-slate-200' },
          { label: 'Draft', value: stats.draft, color: 'text-slate-600 bg-slate-50 border-slate-200' },
          { label: 'Published', value: stats.published, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Active', value: stats.active, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        ].map(s => (
          <div key={s.label} className={`border rounded-lg p-2 text-center ${s.color}`}>
            <p className="text-lg font-black">{s.value}</p>
            <p className="text-[8px] font-bold uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quizzes..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs" />
        </div>
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {[{ id: 'all', label: 'All' }, { id: 'draft', label: 'Draft' }, { id: 'published', label: 'Published' }, { id: 'active', label: 'Active' }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-2 py-1 text-[9px] font-semibold rounded-md transition-colors ${
                filter === f.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>{f.label}</button>
          ))}
        </div>
        <Button variant="primary" size="sm" className="text-[10px] px-2 py-1 whitespace-nowrap" onClick={openCreateModal}>
          <Plus className="w-3 h-3 mr-1" /> New Quiz
        </Button>
      </div>

      {/* Quiz List */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><Skeleton.CardGrid count={4} cols={2} /></div>
      ) : filtered.length === 0 ? (
        <Card><CardBody className="p-6">
          <EmptyState title="No Quizzes" description="Create your first quiz for this class" icon={<HelpCircle className="w-6 h-6" />} />
        </CardBody></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(quiz => {
            const st = statusConfig[quiz.status] || statusConfig.draft;
            const isExpanded = expandedQuiz === quiz.id;
            return (
              <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                <CardBody className="p-3">
                  {/* Quiz Header */}
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => { setExpandedQuiz(isExpanded ? null : quiz.id); if (!isExpanded) loadResults(quiz.id); }}
                      className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                        <h3 className="text-xs font-bold text-slate-900 truncate">{quiz.title}</h3>
                        <Badge variant={st.v} size="sm">{st.l}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[9px] text-slate-500 ml-5">
                        <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{quiz.question_count || 0} questions</span>
                        <span className="flex items-center gap-0.5"><BarChart3 className="w-2.5 h-2.5" />{quiz.total_points || 0} pts</span>
                        {quiz.time_limit_minutes && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{quiz.time_limit_minutes}m</span>}
                        {quiz.subject_name && <span className="flex items-center gap-0.5"><BookOpen className="w-2.5 h-2.5" />{quiz.subject_name}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {quiz.status === 'draft' ? (
                        <Button variant="ghost" size="sm" className="text-[9px] text-green-600"
                          onClick={() => handlePublish(quiz.id, 'active')}>
                          <CheckCircle className="w-3 h-3 mr-0.5" /> Publish
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-[9px] text-amber-600"
                          onClick={() => handlePublish(quiz.id, 'draft')}>
                          <XCircle className="w-3 h-3 mr-0.5" /> Unpublish
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-[9px] text-red-500"
                        onClick={() => handleDelete(quiz.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 ml-5 space-y-3">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-violet-50 border border-violet-200 rounded-lg p-2 text-center">
                          <p className="text-sm font-black text-violet-700">{quiz.question_count || 0}</p>
                          <p className="text-[8px] font-bold text-violet-600">Questions</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                          <p className="text-sm font-black text-blue-700">{quiz.total_points || 0}</p>
                          <p className="text-[8px] font-bold text-blue-600">Total Points</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
                          <p className="text-sm font-black text-emerald-700">{quiz.time_limit_minutes || '—'}</p>
                          <p className="text-[8px] font-bold text-emerald-600">Minutes</p>
                        </div>
                      </div>

                      {/* Results Table */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Student Results
                        </h4>
                        {loadingResults ? (
                          <div className="flex justify-center py-4"><Skeleton.Table rows={5} cols={4} /></div>
                        ) : !quizResults || quizResults.length === 0 ? (
                          <p className="text-[10px] text-slate-400 py-2">No attempts yet</p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto">
                            <table className="w-full text-[9px]">
                              <thead>
                                <tr className="text-left text-slate-500 border-b border-slate-100">
                                  <th className="pb-1 font-semibold">Student</th>
                                  <th className="pb-1 font-semibold text-center">Score</th>
                                  <th className="pb-1 font-semibold text-center">%</th>
                                  <th className="pb-1 font-semibold text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {quizResults.map((r, i) => (
                                  <tr key={i} className="border-b border-slate-50">
                                    <td className="py-1.5 font-medium text-slate-700">{r.student_name || r.student?.username}</td>
                                    <td className="py-1.5 text-center">{r.total_score}/{r.max_score}</td>
                                    <td className="py-1.5 text-center">
                                      <span className={`font-bold ${parseFloat(r.percentage) >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {r.percentage}%
                                      </span>
                                    </td>
                                    <td className="py-1.5 text-center">
                                      {r.is_graded ? (
                                        <Badge variant="green" size="sm">Graded</Badge>
                                      ) : (
                                        <Badge variant="amber" size="sm">Pending</Badge>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Quiz Wizard */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} size="lg">
        <ModalBody className="p-0">
          {/* Header with step indicator */}
          <div className="bg-violet-600 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-white">Create New Quiz</h2>
                <p className="text-violet-200 text-xs mt-0.5">
                  {createStep === 1 ? 'Choose a template and add details' : 'Configure timing and options'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${createStep >= 1 ? 'bg-white text-violet-600' : 'bg-violet-500 text-violet-300'}`}>1</span>
                <span className={`w-5 h-0.5 ${createStep >= 2 ? 'bg-white' : 'bg-violet-500'}`} />
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${createStep >= 2 ? 'bg-white text-violet-600' : 'bg-violet-500 text-violet-300'}`}>2</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            {/* STEP 1: Quiz Details + Templates */}
            {createStep === 1 && (
              <div className="space-y-5">
                {/* Template Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Quick Start — Pick a Template</label>
                  <div className="grid grid-cols-5 gap-2">
                    {QUIZ_TEMPLATES.map(tpl => (
                      <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                        className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                          selectedTemplate === tpl.id
                            ? 'border-violet-500 bg-violet-50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}>
                        <span className="text-xl block mb-1">{tpl.icon}</span>
                        <p className="text-[11px] font-bold text-slate-800 leading-tight">{tpl.label}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{tpl.desc}</p>
                        {selectedTemplate === tpl.id && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quiz Title *</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    placeholder="e.g. Chapter 5 Vocabulary Quiz" />
                  <p className="text-[10px] text-slate-400 mt-1">Give it a clear name students will recognize</p>
                </div>

                {/* Subject + Component */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                    <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                      <option value="">Select subject</option>
                      {subjects.map(s => <option key={s.id} value={s.subject}>{s.subject_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Grade Component</label>
                    <select value={form.grade_component} onChange={(e) => setForm({ ...form, grade_component: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                      <option value="quiz">Quiz</option>
                      <option value="exam">Exam</option>
                      <option value="activity">Activity</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">Links to grade calculation</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description <span className="font-normal text-slate-400">(optional)</span></label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    rows={2} placeholder="Brief instructions for students (e.g. 'Answer all questions. You have 30 minutes.')" />
                </div>
              </div>
            )}

            {/* STEP 2: Settings */}
            {createStep === 2 && (
              <div className="space-y-5">
                {/* Time Limit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time Limit</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min="1" max="300" value={form.time_limit_minutes}
                      onChange={(e) => setForm({ ...form, time_limit_minutes: e.target.value })}
                      className="w-28 px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                      placeholder="—" />
                    <span className="text-sm text-slate-600">minutes</span>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, time_limit_minutes: '' }))}
                      className="text-xs text-violet-600 hover:text-violet-800 font-medium">No limit</button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty or click No limit for untimed quizzes</p>
                </div>

                {/* Max Attempts */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Attempts Allowed</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min="1" max="99" value={form.max_attempts}
                      onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) || 1 })}
                      className="w-28 px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                    <span className="text-sm text-slate-600">attempts</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Set to 99 for unlimited practice attempts</p>
                </div>

                {/* Options */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-700">Quiz Behavior</p>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={form.shuffle_questions}
                      onChange={(e) => setForm({ ...form, shuffle_questions: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Shuffle question order</p>
                      <p className="text-[10px] text-slate-400">Each student sees questions in a different random order</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={form.show_correct_answers}
                      onChange={(e) => setForm({ ...form, show_correct_answers: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Show correct answers after submission</p>
                      <p className="text-[10px] text-slate-400">Students see which answers were right/wrong immediately</p>
                    </div>
                  </label>
                </div>

                {/* Summary Card */}
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-violet-800 mb-2">Quiz Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div><span className="font-medium">Title:</span> {form.title || '—'}</div>
                    <div><span className="font-medium">Subject:</span> {subjects.find(s => s.subject == form.subject)?.subject_name || '—'}</div>
                    <div><span className="font-medium">Time:</span> {form.time_limit_minutes ? `${form.time_limit_minutes} minutes` : 'No limit'}</div>
                    <div><span className="font-medium">Attempts:</span> {form.max_attempts >= 99 ? 'Unlimited' : form.max_attempts}</div>
                    <div><span className="font-medium">Shuffle:</span> {form.shuffle_questions ? 'Yes' : 'No'}</div>
                    <div><span className="font-medium">Show answers:</span> {form.show_correct_answers ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              {createStep === 2 && (
                <button onClick={() => setCreateStep(1)} className="text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1">
                  ← Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              {createStep === 1 ? (
                <button onClick={() => setCreateStep(2)}
                  disabled={!form.title.trim() || !form.subject}
                  className="px-5 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Next →
                </button>
              ) : (
                <button onClick={handleCreate} disabled={saving}
                  className="px-5 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create Quiz
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
};

// ── Student Quizzes View ─────────────────────────────────────────────────────
export const StudentQuizzesView = ({ classroom }) => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchQuizzes(); }, [classroom.id]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quizzes/', { params: { classroom: classroom.id } });
      setQuizzes(res.data?.results || res.data || []);
    } catch { toast.error('Failed to load quizzes'); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    if (!search) return quizzes;
    const s = search.toLowerCase();
    return quizzes.filter(q => q.title?.toLowerCase().includes(s));
  }, [quizzes, search]);

  const available = filtered.filter(q => q.status === 'published' || q.status === 'active');
  const past = filtered.filter(q => q.status === 'closed' || q.status === 'draft');

  const statusConfig = {
    draft: { v: 'slate', l: 'Draft' },
    published: { v: 'green', l: 'Available' },
    active: { v: 'blue', l: 'In Progress' },
    closed: { v: 'red', l: 'Closed' },
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quizzes..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Skeleton.CardGrid count={4} cols={2} /></div>
      ) : (
        <>
          {/* Available Quizzes */}
          {available.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Play className="w-3 h-3" /> Available Quizzes ({available.length})
              </h3>
              <div className="space-y-2">
                {available.map(quiz => {
                  const st = statusConfig[quiz.status] || statusConfig.draft;
                  return (
                    <Card key={quiz.id} className="hover:shadow-md transition-shadow border-l-4 border-l-violet-500">
                      <CardBody className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xs font-bold text-slate-900">{quiz.title}</h3>
                              <Badge variant={st.v} size="sm">{st.l}</Badge>
                            </div>
                            {quiz.description && <p className="text-[10px] text-slate-500 line-clamp-1 mb-1.5">{quiz.description}</p>}
                            <div className="flex items-center gap-3 text-[9px] text-slate-500">
                              <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{quiz.question_count || 0} questions</span>
                              <span className="flex items-center gap-0.5"><BarChart3 className="w-2.5 h-2.5" />{quiz.total_points || 0} points</span>
                              {quiz.time_limit_minutes && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{quiz.time_limit_minutes} min</span>}
                              {quiz.subject_name && <span className="flex items-center gap-0.5"><BookOpen className="w-2.5 h-2.5" />{quiz.subject_name}</span>}
                            </div>
                          </div>
                          <Button variant="primary" size="sm" className="text-[10px] px-3 py-1.5 flex-shrink-0"
                            onClick={() => navigate(`/quizzes/take/${quiz.id}`)}>
                            <Play className="w-3 h-3 mr-1" /> Start
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past / Closed Quizzes */}
          {past.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Past Quizzes ({past.length})
              </h3>
              <div className="space-y-2">
                {past.map(quiz => {
                  const st = statusConfig[quiz.status] || statusConfig.draft;
                  return (
                    <Card key={quiz.id} className="opacity-70">
                      <CardBody className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xs font-bold text-slate-900">{quiz.title}</h3>
                              <Badge variant={st.v} size="sm">{st.l}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-[9px] text-slate-500">
                              <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{quiz.question_count || 0} questions</span>
                              <span className="flex items-center gap-0.5"><BarChart3 className="w-2.5 h-2.5" />{quiz.total_points || 0} points</span>
                            </div>
                          </div>
                          {quiz.status === 'closed' && (
                            <Button variant="ghost" size="sm" className="text-[9px] text-slate-500"
                              onClick={() => navigate(`/quizzes/take/${quiz.id}`)}>
                              <Eye className="w-3 h-3 mr-0.5" /> View
                            </Button>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {available.length === 0 && past.length === 0 && (
            <Card><CardBody className="p-6">
              <EmptyState title="No Quizzes Yet" description="Your teacher hasn't posted any quizzes for this class" icon={<HelpCircle className="w-6 h-6" />} />
            </CardBody></Card>
          )}
        </>
      )}
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
        <div className="flex items-center justify-center h-32"><Skeleton.CardGrid count={4} cols={2} /></div>
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

  if (loading) return <div className="flex items-center justify-center h-32"><Skeleton.StatCard /></div>;
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
