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
import { useNavigate, useParams } from 'react-router-dom';
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

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  revision_needed: 'bg-yellow-100 text-yellow-800',
};

const tabs = [
  { id: 'daily', label: 'Daily Lesson Plans', icon: FileText },
  { id: 'weekly', label: 'Weekly Plans', icon: Calendar },
  { id: 'standards', label: 'Curriculum Standards', icon: BookOpen },
];

const emptyFormData = {
  title: '',
  plan_type: 'DLP',
  classroom: '',
  subject: '',
  date: '',
  quarter: 1,
  week: 1,
  objectives: '',
  content: '',
  materials: '',
  procedure: [{ step_name: 'Introduction', description: '', time_minutes: 5 }],
  values_integration: '',
  remarks: '',
  curriculum_standards: [],
};

export default function LessonPlans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lessonPlans, setLessonPlans] = useState([]);
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [standards, setStandards] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('daily');
  const [filters, setFilters] = useState({
    classroom: '',
    subject: '',
    quarter: '',
    status: '',
  });
  const [calendarView, setCalendarView] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchLessonPlans();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, weeklyRes, standardsRes] = await Promise.allSettled([
        api.get('/lesson-plans/', { params: filters }),
        api.get('/weekly-plans/'),
        api.get('/curriculum-standards/'),
      ]);

      if (plansRes.status === 'fulfilled') setLessonPlans(plansRes.value.data.results || plansRes.value.data);
      if (weeklyRes.status === 'fulfilled') setWeeklyPlans(weeklyRes.value.data.results || weeklyRes.value.data);
      if (standardsRes.status === 'fulfilled') setStandards(standardsRes.value.data.results || standardsRes.value.data);

      const classroomsRes = await api.get('/classrooms/').catch(() => ({ data: { results: [] } }));
      const subjectsRes = await api.get('/subjects/').catch(() => ({ data: { results: [] } }));
      setClassrooms(classroomsRes.data.results || classroomsRes.data || []);
      setSubjects(subjectsRes.data.results || subjectsRes.data || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLessonPlans = async () => {
    try {
      const params = {};
      if (filters.classroom) params.classroom = filters.classroom;
      if (filters.subject) params.subject = filters.subject;
      if (filters.quarter) params.quarter = filters.quarter;
      if (filters.status) params.status = filters.status;

      const res = await api.get('/lesson-plans/', { params });
      setLessonPlans(res.data.results || res.data);
    } catch {
      toast.error('Failed to load lesson plans');
    }
  };

  const fetchWeeklyPlans = async () => {
    try {
      const res = await api.get('/weekly-plans/');
      setWeeklyPlans(res.data.results || res.data);
    } catch {
      toast.error('Failed to load weekly plans');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleProcedureChange = (index, key, value) => {
    setFormData((prev) => {
      const procedure = [...prev.procedure];
      procedure[index] = { ...procedure[index], [key]: value };
      return { ...prev, procedure };
    });
  };

  const addProcedureStep = () => {
    setFormData((prev) => ({
      ...prev,
      procedure: [
        ...prev.procedure,
        { step_name: '', description: '', time_minutes: 0 },
      ],
    }));
  };

  const removeProcedureStep = (index) => {
    setFormData((prev) => ({
      ...prev,
      procedure: prev.procedure.filter((_, i) => i !== index),
    }));
  };

  const handleStandardToggle = (id) => {
    setFormData((prev) => ({
      ...prev,
      curriculum_standards: prev.curriculum_standards.includes(id)
        ? prev.curriculum_standards.filter((s) => s !== id)
        : [...prev.curriculum_standards, id],
    }));
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setShowCreateForm(false);
  };

  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.classroom || !formData.subject) {
      toast.error('Please fill in required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/lesson-plans/', formData);
      toast.success('Lesson plan created successfully');
      resetForm();
      fetchLessonPlans();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create lesson plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateWeeklyPlan = async () => {
    try {
      await api.post('/weekly-plans/', {
        title: `Weekly Plan - Week ${formData.week}`,
        classroom: formData.classroom,
        subject: formData.subject,
        quarter: formData.quarter,
        week: formData.week,
      });
      toast.success('Weekly plan created');
      fetchWeeklyPlans();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create weekly plan');
    }
  };

  const handleSubmitForReview = async (planId) => {
    try {
      await api.post(`/lesson-plans/${planId}/submit_for_review/`);
      toast.success('Submitted for review');
      fetchLessonPlans();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit');
    }
  };

  const handleApprovePlan = async (planId) => {
    try {
      await api.post(`/lesson-plans/${planId}/approve/`);
      toast.success('Lesson plan approved');
      fetchLessonPlans();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve');
    }
  };

  const getCalendarDays = () => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getPlansForDate = (day) => {
    if (!day) return [];
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return lessonPlans.filter((plan) => plan.date === dateStr);
  };

  const filteredPlans = lessonPlans.filter((plan) => {
    if (filters.classroom && plan.classroom !== Number(filters.classroom)) return false;
    if (filters.subject && plan.subject !== Number(filters.subject)) return false;
    if (filters.quarter && plan.quarter !== Number(filters.quarter)) return false;
    if (filters.status && plan.status !== filters.status) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Lesson Plans</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={calendarView ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setCalendarView(!calendarView)}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Calendar
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Plan
          </Button>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select
          value={filters.classroom}
          onChange={(e) => handleFilterChange('classroom', e.target.value)}
          className="rounded-lg border-gray-300 text-sm"
        >
          <option value="">All Classrooms</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>{c.name || `${c.grade_level}-${c.section}`}</option>
          ))}
        </select>
        <select
          value={filters.subject}
          onChange={(e) => handleFilterChange('subject', e.target.value)}
          className="rounded-lg border-gray-300 text-sm"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filters.quarter}
          onChange={(e) => handleFilterChange('quarter', e.target.value)}
          className="rounded-lg border-gray-300 text-sm"
        >
          <option value="">All Terms</option>
          <option value="1">Term 1</option>
          <option value="2">Term 2</option>
          <option value="3">Term 3</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="rounded-lg border-gray-300 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="revision_needed">Needs Revision</option>
        </select>
      </div>

      {activeTab === 'daily' && !calendarView && (
        <div className="space-y-4">
          {filteredPlans.length === 0 ? (
            <EmptyState
              title="No lesson plans found"
              description="Create your first lesson plan to get started."
              action={
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Lesson Plan
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{plan.title}</CardTitle>
                        <Badge className={statusColors[plan.status] || statusColors.draft}>
                          {plan.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>{plan.plan_type}</span>
                        <span>{plan.date}</span>
                        <span>Q{plan.quarter} W{plan.week}</span>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {plan.objectives || 'No objectives set'}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {plan.procedure?.map((_, i) => (
                            <span key={i} className="w-2 h-2 rounded-full bg-blue-400" />
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          {plan.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSubmitForReview(plan.id)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Submit
                            </Button>
                          )}
                          {plan.status === 'submitted' && (
                            <Button
                              size="sm"
                              onClick={() => handleApprovePlan(plan.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/lesson-plans/${plan.id}/edit`)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'daily' && calendarView && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (calendarMonth === 0) {
                    setCalendarMonth(11);
                    setCalendarYear((y) => y - 1);
                  } else {
                    setCalendarMonth((m) => m - 1);
                  }
                }}
              >
                Prev
              </Button>
              <h3 className="font-semibold">
                {new Date(calendarYear, calendarMonth).toLocaleString('default', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (calendarMonth === 11) {
                    setCalendarMonth(0);
                    setCalendarYear((y) => y + 1);
                  } else {
                    setCalendarMonth((m) => m + 1);
                  }
                }}
              >
                Next
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getCalendarDays().map((day, i) => {
                const plans = getPlansForDate(day);
                return (
                  <div
                    key={i}
                    className={`min-h-[80px] p-1 rounded border ${
                      day ? 'border-gray-200 hover:border-blue-300' : 'border-transparent'
                    } ${plans.length > 0 ? 'bg-blue-50' : ''}`}
                  >
                    {day && (
                      <>
                        <div className="text-xs font-medium text-gray-700 mb-1">{day}</div>
                        {plans.slice(0, 2).map((plan) => (
                          <div
                            key={plan.id}
                            className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate ${statusColors[plan.status] || 'bg-gray-100'}`}
                            title={plan.title}
                          >
                            {plan.title}
                          </div>
                        ))}
                        {plans.length > 2 && (
                          <div className="text-[10px] text-gray-500">+{plans.length - 2} more</div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'weekly' && (
        <div className="space-y-4">
          <Button onClick={handleCreateWeeklyPlan}>
            <Plus className="h-4 w-4 mr-1" />
            Create Weekly Plan
          </Button>
          {weeklyPlans.length === 0 ? (
            <EmptyState
              title="No weekly plans"
              description="Create a weekly plan to organize your daily lesson plans."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklyPlans.map((plan) => (
                <Card key={plan.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{plan.title}</CardTitle>
                    <div className="text-xs text-gray-500">
                      Q{plan.quarter} - Week {plan.week}
                    </div>
                  </CardHeader>
                  <CardBody>
                    <p className="text-sm text-gray-600">
                      {plan.lesson_plans?.length || 0} daily plans
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => navigate(`/weekly-plans/${plan.id}`)}
                    >
                      View Details
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'standards' && (
        <div className="space-y-4">
          {standards.length === 0 ? (
            <EmptyState
              title="No curriculum standards loaded"
              description="Curriculum standards will appear here once synced."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {standards.map((std) => (
                <Card key={std.id}>
                  <CardBody className="py-3">
                    <div className="font-medium text-sm">{std.code}</div>
                    <p className="text-xs text-gray-600 mt-1">{std.description}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetForm();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <form onSubmit={handleSubmitPlan}>
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold">New Lesson Plan</h2>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-xl">&times;</span>
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                      placeholder="e.g., Introduction to Fractions"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type *</label>
                    <select
                      value={formData.plan_type}
                      onChange={(e) => handleFormChange('plan_type', e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value="DLP">DLP (Daily Lesson Plan)</option>
                      <option value="DLL">DLL (Daily Lesson Log)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Classroom *</label>
                    <select
                      value={formData.classroom}
                      onChange={(e) => handleFormChange('classroom', e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                      required
                    >
                      <option value="">Select classroom</option>
                      {classrooms.map((c) => (
                        <option key={c.id} value={c.id}>{c.name || `${c.grade_level}-${c.section}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => handleFormChange('subject', e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                      required
                    >
                      <option value="">Select subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                    <select
                      value={formData.quarter}
                      onChange={(e) => handleFormChange('quarter', Number(e.target.value))}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value={1}>Term 1</option>
                      <option value={2}>Term 2</option>
                      <option value={3}>Term 3</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.week}
                      onChange={(e) => handleFormChange('week', Number(e.target.value))}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Learning Objectives
                  </label>
                  <textarea
                    value={formData.objectives}
                    onChange={(e) => handleFormChange('objectives', e.target.value)}
                    className="w-full rounded-lg border-gray-300 text-sm"
                    rows={3}
                    placeholder="At the end of the lesson, students should be able to:&#10;IPI: Identify...&#10;IPI: Perform...&#10;IPI: Illustrate..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content / Topic</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleFormChange('content', e.target.value)}
                    className="w-full rounded-lg border-gray-300 text-sm"
                    rows={2}
                    placeholder="Topic and content details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Materials Needed</label>
                  <textarea
                    value={formData.materials}
                    onChange={(e) => handleFormChange('materials', e.target.value)}
                    className="w-full rounded-lg border-gray-300 text-sm"
                    rows={2}
                    placeholder="Textbook, chart paper, markers, worksheets..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Procedure</label>
                    <Button type="button" size="sm" variant="ghost" onClick={addProcedureStep}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Step
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.procedure.map((step, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={step.step_name}
                            onChange={(e) => handleProcedureChange(index, 'step_name', e.target.value)}
                            className="w-full rounded border-gray-300 text-sm"
                            placeholder="Step name (e.g., Activity, Assessment)"
                          />
                          <textarea
                            value={step.description}
                            onChange={(e) => handleProcedureChange(index, 'description', e.target.value)}
                            className="w-full rounded border-gray-300 text-sm"
                            rows={2}
                            placeholder="Describe this step..."
                          />
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <input
                              type="number"
                              min={0}
                              value={step.time_minutes}
                              onChange={(e) =>
                                handleProcedureChange(index, 'time_minutes', Number(e.target.value))
                              }
                              className="w-20 rounded border-gray-300 text-xs px-2 py-1"
                              placeholder="min"
                            />
                            <span>minutes</span>
                          </div>
                        </div>
                        {formData.procedure.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProcedureStep(index)}
                            className="text-red-400 hover:text-red-600 mt-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Values Integration
                  </label>
                  <textarea
                    value={formData.values_integration}
                    onChange={(e) => handleFormChange('values_integration', e.target.value)}
                    className="w-full rounded-lg border-gray-300 text-sm"
                    rows={2}
                    placeholder="Values integration for this lesson..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => handleFormChange('remarks', e.target.value)}
                    className="w-full rounded-lg border-gray-300 text-sm"
                    rows={2}
                    placeholder="Additional remarks..."
                  />
                </div>

                {standards.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Curriculum Standards
                    </label>
                    <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2">
                      {standards.map((std) => (
                        <label key={std.id} className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.curriculum_standards.includes(std.id)}
                            onChange={() => handleStandardToggle(std.id)}
                            className="mt-0.5 rounded border-gray-300"
                          />
                          <span className="text-xs">
                            <span className="font-medium">{std.code}</span>
                            <span className="text-gray-500 ml-1">- {std.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Lesson Plan'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
