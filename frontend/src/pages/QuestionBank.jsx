import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Card, CardHeader, CardBody, CardTitle,
  Button, Badge, Skeleton, EmptyState,
} from '../components/ui';
import toast from 'react-hot-toast';
import {
  Plus, Edit, Trash2, BookOpen, Search, Filter,
  CheckCircle, XCircle, HelpCircle,
} from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: HelpCircle },
  { value: 'identification', label: 'Identification', icon: Edit },
  { value: 'essay', label: 'Essay', icon: BookOpen },
  { value: 'true_false', label: 'True or False', icon: CheckCircle },
  { value: 'fill_blank', label: 'Fill in the Blank', icon: Edit },
];

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
};

const QuestionBank = () => {
  const { user } = useAuth();
  const [banks, setBanks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [showCreateBank, setShowCreateBank] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [bankForm, setBankForm] = useState({ name: '', description: '', subject: '' });
  const [questionForm, setQuestionForm] = useState({
    question_type: 'multiple_choice',
    difficulty: 'medium',
    content: '',
    points: 1,
    options: [
      { label: 'A', text: '', is_correct: true },
      { label: 'B', text: '', is_correct: false },
      { label: 'C', text: '', is_correct: false },
      { label: 'D', text: '', is_correct: false },
    ],
    correct_answer: '',
    model_answer: '',
    explanation: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedBank) loadBankQuestions(selectedBank);
  }, [selectedBank]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [banksRes, subjectsRes] = await Promise.all([
        api.get('/question-banks/').catch(() => ({ data: [] })),
        api.get('/subjects/').catch(() => ({ data: [] })),
      ]);
      setBanks(Array.isArray(banksRes.data) ? banksRes.data : banksRes.data?.results || []);
      setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : subjectsRes.data?.results || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadBankQuestions = async (bankId) => {
    try {
      const res = await api.get(`/questions/?bank=${bankId}`);
      setQuestions(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch {
      toast.error('Failed to load questions');
    }
  };

  const handleCreateBank = async (e) => {
    e.preventDefault();
    try {
      await api.post('/question-banks/', bankForm);
      toast.success('Question bank created');
      setShowCreateBank(false);
      setBankForm({ name: '', description: '', subject: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create bank');
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    const payload = { ...questionForm, bank: selectedBank };
    if (questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false') {
      payload.options = questionForm.options;
    }
    try {
      if (editingQuestion) {
        await api.put(`/questions/${editingQuestion.id}/`, payload);
        toast.success('Question updated');
      } else {
        await api.post('/questions/', payload);
        toast.success('Question added');
      }
      setShowAddQuestion(false);
      setEditingQuestion(null);
      resetQuestionForm();
      loadBankQuestions(selectedBank);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/questions/${id}/`);
      toast.success('Question deleted');
      loadBankQuestions(selectedBank);
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const handleEditQuestion = (q) => {
    setEditingQuestion(q);
    setQuestionForm({
      question_type: q.question_type,
      difficulty: q.difficulty,
      content: q.content,
      points: q.points,
      options: q.options?.length ? q.options : [
        { label: 'A', text: '', is_correct: true },
        { label: 'B', text: '', is_correct: false },
        { label: 'C', text: '', is_correct: false },
        { label: 'D', text: '', is_correct: false },
      ],
      correct_answer: q.correct_answer || '',
      model_answer: q.model_answer || '',
      explanation: q.explanation || '',
    });
    setShowAddQuestion(true);
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_type: 'multiple_choice',
      difficulty: 'medium',
      content: '',
      points: 1,
      options: [
        { label: 'A', text: '', is_correct: true },
        { label: 'B', text: '', is_correct: false },
        { label: 'C', text: '', is_correct: false },
        { label: 'D', text: '', is_correct: false },
      ],
      correct_answer: '',
      model_answer: '',
      explanation: '',
    });
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    if (field === 'is_correct' && value === true) {
      newOptions.forEach((opt, i) => { if (i !== index) opt.is_correct = false; });
    }
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const addOption = () => {
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newLabel = labels[questionForm.options.length] || String.fromCharCode(65 + questionForm.options.length);
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { label: newLabel, text: '', is_correct: false }],
    });
  };

  const removeOption = (index) => {
    if (questionForm.options.length <= 2) return;
    const newOptions = questionForm.options.filter((_, i) => i !== index);
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const filteredQuestions = questions.filter((q) => {
    const matchSearch = !searchTerm || q.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || q.question_type === filterType;
    const matchDiff = !filterDifficulty || q.difficulty === filterDifficulty;
    return matchSearch && matchType && matchDiff;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
        <Button onClick={() => setShowCreateBank(true)} className="flex items-center gap-2">
          <Plus size={16} /> New Bank
        </Button>
      </div>

      {/* Banks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {banks.map((bank) => (
          <Card
            key={bank.id}
            className={`cursor-pointer transition-all hover:shadow-md ${selectedBank === bank.id ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setSelectedBank(bank.id)}
          >
            <CardBody className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{bank.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{bank.description || 'No description'}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">{bank.question_count} Q</Badge>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {bank.subject_name || 'All subjects'} · {bank.is_shared ? 'Shared' : 'Private'}
              </p>
            </CardBody>
          </Card>
        ))}
        {banks.length === 0 && (
          <div className="col-span-3">
            <EmptyState message="No question banks yet. Create one to get started." />
          </div>
        )}
      </div>

      {/* Questions Section */}
      {selectedBank && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
            <CardTitle className="text-lg">Questions</CardTitle>
            <Button onClick={() => { resetQuestionForm(); setEditingQuestion(null); setShowAddQuestion(true); }} size="sm" className="flex items-center gap-1">
              <Plus size={14} /> Add Question
            </Button>
          </CardHeader>
          <CardBody className="p-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">All Types</option>
                {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">All Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => (
                <div key={q.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">Q{idx + 1}</span>
                        <Badge className={`text-xs ${DIFFICULTY_COLORS[q.difficulty]}`}>{q.difficulty}</Badge>
                        <Badge className="text-xs bg-gray-100 text-gray-700">{QUESTION_TYPES.find(t => t.value === q.question_type)?.label}</Badge>
                        <span className="text-xs text-gray-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm text-gray-800">{q.content}</p>
                      {q.question_type === 'multiple_choice' && q.options && (
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          {q.options.map((opt) => (
                            <span key={opt.label} className={`text-xs px-2 py-1 rounded ${opt.is_correct ? 'bg-green-100 text-green-800 font-medium' : 'bg-gray-100 text-gray-600'}`}>
                              {opt.label}. {opt.text}
                            </span>
                          ))}
                        </div>
                      )}
                      {(q.question_type === 'identification' || q.question_type === 'fill_blank') && q.correct_answer && (
                        <p className="mt-1 text-xs text-green-700">Answer: {q.correct_answer}</p>
                      )}
                      {q.question_type === 'true_false' && (
                        <p className="mt-1 text-xs text-green-700">Answer: {q.options?.find(o => o.is_correct)?.label || 'Not set'}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditQuestion(q)} className="p-1.5 rounded hover:bg-gray-200 text-gray-500">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredQuestions.length === 0 && (
                <EmptyState message="No questions found. Add your first question!" />
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Create Bank Modal */}
      {showCreateBank && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Create Question Bank</h2>
            <form onSubmit={handleCreateBank} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" required value={bankForm.name} onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g., Grade 7 Math - Chapter 1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={bankForm.description} onChange={(e) => setBankForm({ ...bankForm, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Optional description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select value={bankForm.subject} onChange={(e) => setBankForm({ ...bankForm, subject: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">All Subjects</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowCreateBank(false)}>Cancel</Button>
                <Button type="submit">Create Bank</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Question Modal */}
      {showAddQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8">
            <h2 className="text-lg font-bold mb-4">{editingQuestion ? 'Edit Question' : 'Add Question'}</h2>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={questionForm.question_type} onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select value={questionForm.difficulty} onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                <textarea required value={questionForm.content} onChange={(e) => setQuestionForm({ ...questionForm, content: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Enter the question..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <input type="number" min={1} value={questionForm.points} onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                  className="w-24 border rounded-lg px-3 py-2 text-sm" />
              </div>

              {/* MC Options */}
              {(questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false') && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Options (click radio to mark correct)</label>
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={opt.is_correct}
                        onChange={() => updateOption(idx, 'is_correct', true)}
                        className="text-blue-600" />
                      <span className="text-sm font-medium w-6">{opt.label}.</span>
                      <input type="text" value={opt.text} onChange={(e) => updateOption(idx, 'text', e.target.value)}
                        className="flex-1 border rounded px-2 py-1 text-sm" placeholder={`Option ${opt.label}`}
                        disabled={questionForm.question_type === 'true_false'} />
                      {questionForm.question_type === 'multiple_choice' && questionForm.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {questionForm.question_type === 'multiple_choice' && questionForm.options.length < 6 && (
                    <button type="button" onClick={addOption} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <Plus size={14} /> Add option
                    </button>
                  )}
                </div>
              )}

              {/* Identification / Fill Blank */}
              {(questionForm.question_type === 'identification' || questionForm.question_type === 'fill_blank') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer *</label>
                  <input type="text" required value={questionForm.correct_answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Enter the correct answer" />
                </div>
              )}

              {/* Essay */}
              {questionForm.question_type === 'essay' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model Answer / Rubric</label>
                  <textarea value={questionForm.model_answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, model_answer: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" rows={3}
                    placeholder="Provide a model answer or scoring rubric" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (shown after answering)</label>
                <textarea value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2}
                  placeholder="Explain the correct answer" />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => { setShowAddQuestion(false); setEditingQuestion(null); }}>Cancel</Button>
                <Button type="submit">{editingQuestion ? 'Update' : 'Add'} Question</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
