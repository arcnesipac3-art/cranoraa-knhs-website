import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Card, CardHeader, CardBody, CardTitle,
  Button, Badge, Skeleton, EmptyState,
  Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle,
  ModalField, ModalBtnPrimary, ModalBtnSecondary,
  modalInputCls, modalSelectCls, modalTextareaCls,
  Input, Textarea, Select, SearchInput, Checkbox,
} from '../components/ui';
import toast from 'react-hot-toast';
import {
  Plus, Edit, Trash2, Clock, CheckCircle, XCircle,
  FileText, Users, BarChart3,
} from 'lucide-react';

const TABS = ['My Quizzes', 'Question Bank', 'Create Quiz'];

const QUIZ_TYPES = [
  { value: 'regular', label: 'Regular Quiz' },
  { value: 'prelim', label: 'Prelim Exam' },
  { value: 'midterm', label: 'Midterm Exam' },
  { value: 'finals', label: 'Finals Exam' },
];

const GRADE_COMPONENTS = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'activity', label: 'Activity' },
  { value: 'project', label: 'Project' },
];

const QuestionTypeBadge = ({ type }) => {
  const map = {
    mc: { variant: 'blue', label: 'Multiple Choice' },
    tf: { variant: 'green', label: 'True/False' },
    identification: { variant: 'amber', label: 'Identification' },
    essay: { variant: 'rose', label: 'Essay' },
  };
  const cfg = map[type] || { variant: 'slate', label: type };
  return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
};

const QuizManagement = () => {
  useNavigate();
  useAuth();

  const [activeTab, setActiveTab] = useState('My Quizzes');
  const [quizzes, setQuizzes] = useState([]);
  const [questionBanks, setQuestionBanks] = useState([]);
  const [, setQuestions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClassroom, setFilterClassroom] = useState('');
  const [, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [, setShowCreateForm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedQuestionBank, setSelectedQuestionBank] = useState(null);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankQuestionsLoading, setBankQuestionsLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    classroom: '',
    subject: '',
    quiz_type: 'regular',
    time_limit: '',
    max_attempts: 1,
    shuffle_questions: false,
    show_correct_answers: true,
    start_at: '',
    end_at: '',
    grade_component: 'quiz',
    passing_score: '',
  });

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'mc',
    choices: [
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ],
    correct_answer: '',
    model_answer: '',
    points: 1,
  });
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [, setEssayGrades] = useState({});
  const [gradingAttempt, setGradingAttempt] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [quizRes, bankRes, classroomRes, subjectRes] = await Promise.all([
        api.get('/quizzes/'),
        api.get('/question-banks/'),
        api.get('/classrooms/'),
        api.get('/subjects/'),
      ]);
      setQuizzes(quizRes.data?.results || quizRes.data || []);
      setQuestionBanks(bankRes.data?.results || bankRes.data || []);
      setClassrooms(classroomRes.data?.results || classroomRes.data || []);
      setSubjects(subjectRes.data?.results || subjectRes.data || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchSearch = !search || q.title?.toLowerCase().includes(search.toLowerCase());
      const matchClassroom = !filterClassroom || String(q.classroom) === filterClassroom;
      const matchSubject = !filterSubject || String(q.subject) === filterSubject;
      const matchStatus = !filterStatus || q.status === filterStatus;
      return matchSearch && matchClassroom && matchSubject && matchStatus;
    });
  }, [quizzes, search, filterClassroom, filterSubject, filterStatus]);

  const loadBankQuestions = async (bankId) => {
    setSelectedQuestionBank(bankId);
    setBankQuestionsLoading(true);
    try {
      const res = await api.get(`/questions/?bank=${bankId}`);
      setBankQuestions(res.data?.results || res.data || []);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setBankQuestionsLoading(false);
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.classroom || !createForm.subject) {
      toast.error('Please fill in required fields');
      return;
    }
    try {
      const payload = {
        ...createForm,
        time_limit: createForm.time_limit ? parseInt(createForm.time_limit) : null,
        max_attempts: parseInt(createForm.max_attempts),
        passing_score: createForm.passing_score ? parseFloat(createForm.passing_score) : null,
      };
      await api.post('/quizzes/', payload);
      toast.success('Quiz created successfully');
      setShowCreateForm(false);
      setCreateForm({
        title: '', description: '', classroom: '', subject: '',
        quiz_type: 'regular', time_limit: '', max_attempts: 1,
        shuffle_questions: false, show_correct_answers: true,
        start_at: '', end_at: '', grade_component: 'quiz',
        passing_score: '',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create quiz');
    }
  };

  const handlePublish = async (quizId, publish) => {
    try {
      await api.post(`/quizzes/${quizId}/${publish ? 'publish' : 'unpublish'}/`);
      toast.success(publish ? 'Quiz published' : 'Quiz unpublished');
      fetchData();
    } catch {
      toast.error('Action failed');
    }
  };

  const handleDuplicateQuiz = async (quizId) => {
    try {
      await api.post(`/quizzes/${quizId}/duplicate/`);
      toast.success('Quiz duplicated');
      fetchData();
    } catch {
      toast.error('Failed to duplicate quiz');
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await api.delete(`/quizzes/${quizId}/`);
      toast.success('Quiz deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete quiz');
    }
  };

  const loadQuizResults = async (quizId) => {
    setSelectedQuiz(quizzes.find((q) => q.id === quizId));
    setResultsLoading(true);
    setShowResults(true);
    try {
      const res = await api.get(`/quizzes/${quizId}/results/`);
      setQuizResults(res.data?.results || res.data || []);
    } catch {
      toast.error('Failed to load results');
    } finally {
      setResultsLoading(false);
    }
  };

  const handleGradeEssay = async (attemptId, questionId, score) => {
    setGradingAttempt(attemptId);
    try {
      await api.post(`/quizzes/${selectedQuiz.id}/grade_essay/`, {
        attempt_id: attemptId,
        question_id: questionId,
        score: parseFloat(score),
      });
      toast.success('Essay graded');
      loadQuizResults(selectedQuiz.id);
    } catch {
      toast.error('Failed to grade essay');
    } finally {
      setGradingAttempt(null);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/questions/${questionId}/`);
      toast.success('Question deleted');
      if (selectedQuestionBank) loadBankQuestions(selectedQuestionBank);
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: '',
      question_type: 'mc',
      choices: [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
      correct_answer: '',
      model_answer: '',
      points: 1,
    });
  };

  const updateChoice = (index, field, value) => {
    const updated = [...questionForm.choices];
    if (field === 'is_correct') {
      updated.forEach((c, i) => (c.is_correct = i === index ? value : false));
    } else {
      updated[index].text = value;
    }
    setQuestionForm({ ...questionForm, choices: updated });
  };

  const addChoice = () => {
    if (questionForm.choices.length >= 6) return;
    setQuestionForm({
      ...questionForm,
      choices: [...questionForm.choices, { text: '', is_correct: false }],
    });
  };

  const removeChoice = (index) => {
    if (questionForm.choices.length <= 2) return;
    const updated = questionForm.choices.filter((_, i) => i !== index);
    setQuestionForm({ ...questionForm, choices: updated });
  };

  const statusBadge = (status) => {
    const map = {
      draft: { variant: 'slate', label: 'Draft', icon: <FileText className="w-3 h-3" /> },
      published: { variant: 'blue', label: 'Published', icon: <CheckCircle className="w-3 h-3" /> },
      active: { variant: 'green', label: 'Active', icon: <CheckCircle className="w-3 h-3" /> },
      closed: { variant: 'red', label: 'Closed', icon: <XCircle className="w-3 h-3" /> },
    };
    const cfg = map[status] || map.draft;
    return <Badge variant={cfg.variant} size="sm" dot icon={cfg.icon}>{cfg.label}</Badge>;
  };

  const tabButtonCls = (tab) =>
    `px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest transition-all rounded-lg ${
      activeTab === tab
        ? 'bg-violet-600 text-white shadow-md'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-3 sm:px-4 py-4 sm:py-5 md:px-6 md:py-6 space-y-4 sm:space-y-5 md:space-y-6"
    >
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">
            <BarChart3 className="w-4 h-4" />
            <span>Assessment</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Quiz Management
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-semibold">
            Create and manage quizzes, exams, and question banks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => { setActiveTab('Create Quiz'); setShowCreateForm(true); }}>
            <Plus className="w-4 h-4" />
            New Quiz
          </Button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={tabButtonCls(tab)}>
            {tab === 'My Quizzes' && <FileText className="w-3.5 h-3.5 inline mr-1.5" />}
            {tab === 'Question Bank' && <Users className="w-3.5 h-3.5 inline mr-1.5" />}
            {tab === 'Create Quiz' && <Plus className="w-3.5 h-3.5 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: MY QUIZZES */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'My Quizzes' && (
        <>
          <Card>
            <CardBody className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <SearchInput placeholder="Search quizzes..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select value={filterClassroom} onChange={(e) => setFilterClassroom(e.target.value)}
                  className="px-3 py-2.5 border border-slate-300 rounded-md bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all">
                  <option value="">All Classrooms</option>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2.5 border border-slate-300 rounded-md bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all">
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </CardBody>
          </Card>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="p-4 border-b border-slate-100 space-y-2">
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-2/3 rounded" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <Card>
              <CardBody className="p-12">
                <EmptyState
                  title="No Quizzes Found"
                  description={search || filterClassroom || filterStatus ? 'Try adjusting your filters' : 'Create your first quiz to get started'}
                  icon={<BarChart3 className="w-6 h-6" />}
                  actionLabel="Create Quiz"
                  onAction={() => setActiveTab('Create Quiz')}
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
                  <Card className="border-l-4 border-l-violet-500 hover:shadow-lg transition-all">
                    <CardHeader divider>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base truncate">{quiz.title}</CardTitle>
                          <p className="text-xs text-slate-500 mt-1 truncate">{quiz.description || 'No description'}</p>
                        </div>
                        {statusBadge(quiz.status)}
                      </div>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="blue" size="sm">{QUIZ_TYPES.find((t) => t.value === quiz.quiz_type)?.label || quiz.quiz_type}</Badge>
                          {quiz.time_limit && <Badge variant="slate" size="sm"><Clock className="w-3 h-3 mr-1" />{quiz.time_limit} min</Badge>}
                          <Badge variant="slate" size="sm">Max: {quiz.max_attempts} attempt{quiz.max_attempts !== 1 ? 's' : ''}</Badge>
                          {quiz.passing_score && <Badge variant="amber" size="sm">Pass: {quiz.passing_score}%</Badge>}
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                          <p>Classroom: <span className="font-semibold text-slate-700">{quiz.classroom_name || 'N/A'}</span></p>
                          <p>Subject: <span className="font-semibold text-slate-700">{quiz.subject_name || 'N/A'}</span></p>
                          {quiz.total_questions != null && <p>Questions: <span className="font-semibold text-slate-700">{quiz.total_questions}</span></p>}
                        </div>
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                          {quiz.status === 'draft' ? (
                            <>
                              <Button variant="success" size="sm" onClick={() => handlePublish(quiz.id, true)}>
                                <CheckCircle className="w-3.5 h-3.5" /> Publish
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDuplicateQuiz(quiz.id)}>
                                <FileText className="w-3.5 h-3.5" /> Duplicate
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleDeleteQuiz(quiz.id)}>
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </Button>
                            </>
                          ) : quiz.status === 'active' ? (
                            <>
                              <Button variant="secondary" size="sm" onClick={() => loadQuizResults(quiz.id)}>
                                <BarChart3 className="w-3.5 h-3.5" /> Results
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDuplicateQuiz(quiz.id)}>
                                <FileText className="w-3.5 h-3.5" /> Duplicate
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handlePublish(quiz.id, false)}>
                                <XCircle className="w-3.5 h-3.5" /> Close
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="secondary" size="sm" onClick={() => loadQuizResults(quiz.id)}>
                                <BarChart3 className="w-3.5 h-3.5" /> Results
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDuplicateQuiz(quiz.id)}>
                                <FileText className="w-3.5 h-3.5" /> Duplicate
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handlePublish(quiz.id, false)}>
                                <CheckCircle className="w-3.5 h-3.5" /> Reopen
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: QUESTION BANK */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'Question Bank' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Banks list */}
          <Card className="lg:col-span-1">
            <CardHeader divider>
              <div className="flex items-center justify-between">
                <CardTitle>Question Banks</CardTitle>
                <Button variant="primary" size="sm" onClick={() => setShowAddQuestion(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-2 max-h-[600px] overflow-y-auto">
              {questionBanks.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No question banks yet</p>
              ) : (
                questionBanks.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => loadBankQuestions(bank.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedQuestionBank === bank.id
                        ? 'bg-violet-50 border border-violet-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900">{bank.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{bank.description || 'No description'}</p>
                    <p className="text-xs text-violet-600 font-semibold mt-1">{bank.question_count ?? 0} questions</p>
                  </button>
                ))
              )}
            </CardBody>
          </Card>

          {/* Questions in selected bank */}
          <Card className="lg:col-span-2">
            <CardHeader divider>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedQuestionBank ? `${questionBanks.find((b) => b.id === selectedQuestionBank)?.name || ''} Questions` : 'Select a bank'}</CardTitle>
                {selectedQuestionBank && (
                  <Button variant="primary" size="sm" onClick={() => { setShowAddQuestion(true); resetQuestionForm(); setEditingQuestion(null); }}>
                    <Plus className="w-4 h-4" /> Add Question
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {!selectedQuestionBank ? (
                <EmptyState title="Select a Question Bank" description="Choose a bank from the left to view its questions" icon={<FileText className="w-6 h-6" />} />
              ) : bankQuestionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-lg border border-slate-200 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : bankQuestions.length === 0 ? (
                <EmptyState title="No Questions" description="Add questions to this bank" icon={<Plus className="w-6 h-6" />} actionLabel="Add Question" onAction={() => setShowAddQuestion(true)} />
              ) : (
                <div className="space-y-3">
                  {bankQuestions.map((q) => (
                    <div key={q.id} className="p-4 rounded-lg border border-slate-200 bg-white hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{q.question_text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <QuestionTypeBadge type={q.question_type} />
                            <span className="text-xs text-slate-500">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                          </div>
                          {q.question_type === 'mc' && q.choices && (
                            <div className="mt-2 space-y-1">
                              {q.choices.map((c, i) => (
                                <p key={i} className={`text-xs ${c.is_correct ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                                  {String.fromCharCode(65 + i)}. {c.text} {c.is_correct && '✓'}
                                </p>
                              ))}
                            </div>
                          )}
                          {q.question_type === 'identification' && (
                            <p className="text-xs text-emerald-600 font-bold mt-2">Answer: {q.correct_answer}</p>
                          )}
                          {q.question_type === 'tf' && (
                            <p className="text-xs text-emerald-600 font-bold mt-2">Answer: {q.correct_answer ? 'True' : 'False'}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingQuestion(q); setQuestionForm({ ...q }); setShowAddQuestion(true); }}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(q.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: CREATE QUIZ */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'Create Quiz' && (
        <Card>
          <CardHeader divider>
            <CardTitle>Create New Quiz</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreateQuiz} className="max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input label="Quiz Title" required value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="e.g. Midterm Exam - Chapter 1-5" />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Description" value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Optional description or instructions..." rows={2} />
                </div>
                <Select label="Classroom" required value={createForm.classroom}
                  onChange={(e) => setCreateForm({ ...createForm, classroom: e.target.value })}>
                  <option value="">Select classroom</option>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select label="Subject" required value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}>
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Select label="Quiz Type" value={createForm.quiz_type}
                  onChange={(e) => setCreateForm({ ...createForm, quiz_type: e.target.value })}>
                  {QUIZ_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Select label="Grade Component" value={createForm.grade_component}
                  onChange={(e) => setCreateForm({ ...createForm, grade_component: e.target.value })}>
                  {GRADE_COMPONENTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
                <Input label="Time Limit (minutes)" type="number" value={createForm.time_limit}
                  onChange={(e) => setCreateForm({ ...createForm, time_limit: e.target.value })}
                  placeholder="No limit" />
                <Input label="Max Attempts" type="number" min="1" value={createForm.max_attempts}
                  onChange={(e) => setCreateForm({ ...createForm, max_attempts: e.target.value })} />
                <Input label="Passing Score (%)" type="number" min="0" max="100" value={createForm.passing_score || ''}
                  onChange={(e) => setCreateForm({ ...createForm, passing_score: e.target.value })}
                  placeholder="No passing score" />
                <Input label="Start At" type="datetime-local" value={createForm.start_at}
                  onChange={(e) => setCreateForm({ ...createForm, start_at: e.target.value })} />
                <Input label="End At" type="datetime-local" value={createForm.end_at}
                  onChange={(e) => setCreateForm({ ...createForm, end_at: e.target.value })} />
                <div className="md:col-span-2 flex items-center gap-6">
                  <Checkbox label="Shuffle questions" checked={createForm.shuffle_questions}
                    onChange={(e) => setCreateForm({ ...createForm, shuffle_questions: e.target.checked })} />
                  <Checkbox label="Show correct answers after submission" checked={createForm.show_correct_answers}
                    onChange={(e) => setCreateForm({ ...createForm, show_correct_answers: e.target.checked })} />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-200">
                <Button variant="primary" type="submit">
                  <Plus className="w-4 h-4" /> Create Quiz
                </Button>
                <Button variant="secondary" type="button" onClick={() => setActiveTab('My Quizzes')}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD QUESTION */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddQuestion && (
          <Modal isOpen={showAddQuestion} onClose={() => { setShowAddQuestion(false); setEditingQuestion(null); }} size="lg">
            <ModalHeader onClose={() => { setShowAddQuestion(false); setEditingQuestion(null); }}>
              <ModalTitle title={editingQuestion ? 'Edit Question' : 'Add Question'} subtitle="Question Bank" />
            </ModalHeader>
            <form onSubmit={handleSaveQuestion}>
              <ModalBody>
                <div className="space-y-4">
                  <ModalField label="Question Text" required>
                    <textarea
                      value={questionForm.question_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                      className={modalTextareaCls}
                      rows={3}
                      placeholder="Enter your question..."
                    />
                  </ModalField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ModalField label="Question Type">
                      <select value={questionForm.question_type}
                        onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                        className={modalSelectCls}>
                        <option value="mc">Multiple Choice</option>
                        <option value="tf">True/False</option>
                        <option value="identification">Identification</option>
                        <option value="essay">Essay</option>
                      </select>
                    </ModalField>
                    <ModalField label="Points">
                      <input type="number" min="1" value={questionForm.points}
                        onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                        className={modalInputCls} />
                    </ModalField>
                  </div>

                  {/* MC choices */}
                  {questionForm.question_type === 'mc' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">Choices</label>
                      {questionForm.choices.map((choice, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="radio" name="correct_mc"
                            checked={choice.is_correct}
                            onChange={() => updateChoice(i, 'is_correct', true)}
                            className="w-4 h-4 text-violet-600" />
                          <input type="text" value={choice.text}
                            onChange={(e) => updateChoice(i, 'text', e.target.value)}
                            placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                            className={modalInputCls} />
                          {questionForm.choices.length > 2 && (
                            <button type="button" onClick={() => removeChoice(i)}
                              className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {questionForm.choices.length < 6 && (
                        <Button variant="ghost" size="sm" type="button" onClick={addChoice}>
                          <Plus className="w-3.5 h-3.5" /> Add Choice
                        </Button>
                      )}
                    </div>
                  )}

                  {/* TF */}
                  {questionForm.question_type === 'tf' && (
                    <ModalField label="Correct Answer">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="tf_answer" checked={questionForm.correct_answer === 'true'}
                            onChange={() => setQuestionForm({ ...questionForm, correct_answer: 'true' })}
                            className="w-4 h-4 text-violet-600" />
                          <span className="text-sm text-slate-700">True</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="tf_answer" checked={questionForm.correct_answer === 'false'}
                            onChange={() => setQuestionForm({ ...questionForm, correct_answer: 'false' })}
                            className="w-4 h-4 text-violet-600" />
                          <span className="text-sm text-slate-700">False</span>
                        </label>
                      </div>
                    </ModalField>
                  )}

                  {/* Identification */}
                  {questionForm.question_type === 'identification' && (
                    <ModalField label="Correct Answer" required>
                      <input type="text" value={questionForm.correct_answer}
                        onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                        className={modalInputCls} placeholder="Enter the correct answer" />
                    </ModalField>
                  )}

                  {/* Essay */}
                  {questionForm.question_type === 'essay' && (
                    <ModalField label="Model Answer" required>
                      <textarea value={questionForm.model_answer}
                        onChange={(e) => setQuestionForm({ ...questionForm, model_answer: e.target.value })}
                        className={modalTextareaCls} rows={4} placeholder="Enter the model answer for grading reference..." />
                    </ModalField>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <ModalBtnSecondary type="button" onClick={() => { setShowAddQuestion(false); setEditingQuestion(null); }}>Cancel</ModalBtnSecondary>
                <ModalBtnPrimary type="submit">{editingQuestion ? 'Update' : 'Create'}</ModalBtnPrimary>
              </ModalFooter>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: QUIZ RESULTS */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showResults && selectedQuiz && (
          <Modal isOpen={showResults} onClose={() => { setShowResults(false); setSelectedQuiz(null); setQuizResults([]); }} size="xl">
            <ModalHeader onClose={() => { setShowResults(false); setSelectedQuiz(null); setQuizResults([]); }}>
              <ModalTitle title={`${selectedQuiz.title} — Results`} subtitle={`${quizResults.length} attempt(s)`} />
            </ModalHeader>
            <ModalBody>
              {resultsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-lg border border-slate-200 space-y-2">
                      <Skeleton className="h-4 w-1/3 rounded" />
                      <Skeleton className="h-3 w-2/3 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  ))}
                </div>
              ) : quizResults.length === 0 ? (
                <EmptyState title="No Attempts" description="No students have taken this quiz yet" icon={<Users className="w-6 h-6" />} />
              ) : (
                <div className="space-y-3">
                  {quizResults.map((result) => (
                    <div key={result.id} className="p-4 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{result.student_name || result.student_email || 'Student'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Score: <span className="font-bold text-violet-600">{result.score}</span> / {result.total_points}
                            {result.percentage != null && <span className="ml-2">({parseFloat(result.percentage).toFixed(1)}%)</span>}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Submitted: {result.submitted_at ? new Date(result.submitted_at).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <Badge variant={parseFloat(result.percentage) >= 75 ? 'green' : parseFloat(result.percentage) >= 50 ? 'yellow' : 'red'} size="sm">
                          {parseFloat(result.percentage) >= 75 ? 'Passed' : parseFloat(result.percentage) >= 50 ? 'Fair' : 'Failed'}
                        </Badge>
                      </div>
                      {result.answers && result.answers.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                          {result.answers.map((ans, ai) => (
                            <div key={ai} className="text-xs">
                              <p className="font-semibold text-slate-700">Q{ai + 1}: {ans.question_text?.substring(0, 60)}...</p>
                              <p className="text-slate-500 ml-4">Answer: <span className="font-medium text-slate-900">{ans.student_answer || 'No answer'}</span></p>
                              <p className="text-slate-500 ml-4">Correct: <span className="font-medium text-emerald-600">{ans.correct_answer || 'N/A'}</span></p>
                              {ans.question_type === 'essay' && (
                                <div className="ml-4 mt-1">
                                  <label className="text-xs font-bold text-slate-600">Grade: </label>
                                  <input type="number" min="0" max={ans.max_score || 100}
                                    defaultValue={ans.score || ''}
                                    onBlur={(e) => handleGradeEssay(result.id, ans.question_id, e.target.value)}
                                    className="w-20 px-2 py-1 border border-slate-300 rounded text-xs"
                                    disabled={gradingAttempt === result.id} />
                                  <span className="text-slate-400 ml-1">/ {ans.max_score || '?'}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <ModalBtnSecondary onClick={() => { setShowResults(false); setSelectedQuiz(null); setQuizResults([]); }}>Close</ModalBtnSecondary>
            </ModalFooter>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuizManagement;
