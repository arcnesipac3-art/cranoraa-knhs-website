import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button, Badge,
  Skeleton, EmptyState, Modal, ModalHeader, ModalBody, ModalFooter,
  ModalTitle, ModalField, ModalBtnPrimary, ModalBtnSecondary, modalInputCls, modalSelectCls
} from '../components/ui';

/**
 * Class Management Page
 * Classroom/section management with integrated subject assignment
 */

const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

const gradeNum = (name = '') => {
  const m = name.match(/\d+/);
  return m ? parseInt(m[0]) : 999;
};

const ClassManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [formData, setFormData] = useState({ name: '', teacher: '', grade_level: '' });

  // Subject assignment state
  const [showSubjectPanel, setShowSubjectPanel] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectForm, setSubjectForm] = useState({ subject: '', teacher: '' });
  const [savingSubject, setSavingSubject] = useState(false);

  // Bulk operations state
  const [showBulkEnrollModal, setShowBulkEnrollModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [rolloverSettings, setRolloverSettings] = useState({
    sourceYear: '',
    targetYear: '',
    copyTeachers: true,
    copySubjects: false,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [teacherRes, yearRes, subjectRes] = await Promise.all([
          api.get('/users/?role=staff'),
          api.get('/admin/academic-years/'),
          api.get('/subjects/'),
        ]);
        setTeachers(teacherRes.data);
        setSubjects(subjectRes.data);
        const years = [...yearRes.data].sort((a, b) => b.name.localeCompare(a.name));
        setAcademicYears(years);
        const active = years.find(y => y.is_active) || years[0];
        if (active) setSelectedYearId(String(active.id));
      } catch {
        toast.error('Failed to load data');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedYearId) return;
    fetchClasses();
  }, [selectedYearId]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const yearName = getSelectedYearName();
      const res = await api.get(`/classrooms/${yearName ? `?academic_year=${encodeURIComponent(yearName)}` : ''}`);
      setClasses(res.data);
    } catch {
      toast.error('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedYearName = () => {
    const y = academicYears.find(y => String(y.id) === String(selectedYearId));
    return y?.name || '';
  };

  // ── Class CRUD ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingClass(null);
    setFormData({ name: '', teacher: '', grade_level: '' });
    setShowModal(true);
  };

  const openEdit = (cls) => {
    setEditingClass(cls);
    setFormData({ name: cls.name, teacher: cls.teacher || '', grade_level: cls.grade_level || '' });
    setShowModal(true);
  };

  const handleDelete = async (cls) => {
    const result = await Swal.fire({
      title: 'Delete Class?',
      text: `"${cls.name}" and all its data will be permanently removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/classrooms/${cls.id}/`);
      toast.success('Class deleted');
      fetchClasses();
    } catch {
      toast.error('Failed to delete class');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Class name is required');
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        teacher: formData.teacher || null,
        grade_level: formData.grade_level,
        academic_year: selectedYearId || null,
      };
      if (editingClass) {
        await api.patch(`/classrooms/${editingClass.id}/`, payload);
        toast.success('Class updated');
      } else {
        await api.post('/classrooms/', payload);
        toast.success('Class created');
      }
      setShowModal(false);
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.teacher?.[0] || 'Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  // ── Subject Assignment ──────────────────────────────────────────────────

  const openSubjectPanel = async (cls) => {
    setSelectedClass(cls);
    setShowSubjectPanel(true);
    try {
      const res = await api.get(`/classroom-subjects/by_classroom/?classroom_id=${cls.id}`);
      setAssignments(res.data);
    } catch {
      toast.error('Failed to load assignments');
    }
  };

  const fetchAssignments = async (classroomId) => {
    try {
      const res = await api.get(`/classroom-subjects/by_classroom/?classroom_id=${classroomId}`);
      setAssignments(res.data);
    } catch {
      toast.error('Failed to load assignments');
    }
  };

  const openSubjectModal = (assignment = null) => {
    if (assignment) {
      setSubjectForm({ subject: assignment.subject, teacher: assignment.teacher });
      setEditingAssignment(assignment);
    } else {
      setSubjectForm({ subject: '', teacher: '' });
      setEditingAssignment(null);
    }
    setSubjectSearch('');
    setShowSubjectModal(true);
  };

  const handleSubjectDelete = async (assignment) => {
    const result = await Swal.fire({
      title: 'Remove Assignment?',
      text: `Remove "${assignment.subject_name}" from this classroom?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Remove',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/classroom-subjects/${assignment.id}/`);
      toast.success('Assignment removed');
      fetchAssignments(selectedClass.id);
    } catch {
      toast.error('Failed to remove assignment');
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!subjectForm.subject) return toast.error('Please select a subject');
    if (!subjectForm.teacher) return toast.error('Please select a teacher');
    setSavingSubject(true);
    try {
      const payload = { classroom: selectedClass.id, ...subjectForm };
      if (editingAssignment) {
        await api.patch(`/classroom-subjects/${editingAssignment.id}/`, payload);
        toast.success('Assignment updated');
      } else {
        await api.post('/classroom-subjects/', payload);
        toast.success('Subject assigned');
      }
      setShowSubjectModal(false);
      fetchAssignments(selectedClass.id);
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail;
      toast.error(msg || 'This subject is already assigned to this classroom');
    } finally {
      setSavingSubject(false);
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(subjectSearch.toLowerCase());
    const classroomLevel = selectedClass?.name
      ? GRADE_LEVELS.find(l => selectedClass.name.toLowerCase().includes(l.toLowerCase()))
      : null;
    const matchLevel = !classroomLevel || !s.grade_level ||
      s.grade_level.toLowerCase() === classroomLevel.toLowerCase();
    return matchSearch && matchLevel;
  });

  const assignedSubjectIds = new Set(assignments.map(a => a.subject));

  // ── Bulk Operations ─────────────────────────────────────────────────────

  const openBulkEnroll = async (cls) => {
    setSelectedClass(cls);
    setSelectedStudents([]);
    try {
      const res = await api.get('/users/?role=student');
      // Filter out students already enrolled
      const enrolledIds = new Set((await api.get(`/classrooms/${cls.id}/students/`)).data.map(e => e.student));
      const available = res.data.filter(s => !enrolledIds.has(s.id));
      setAvailableStudents(available);
      setShowBulkEnrollModal(true);
    } catch {
      toast.error('Failed to load students');
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedStudents.length === 0) {
      return toast.error('Please select at least one student');
    }
    setSaving(true);
    try {
      const res = await api.post(`/classrooms/${selectedClass.id}/bulk_enroll/`, {
        student_ids: selectedStudents
      });
      toast.success(`Enrolled ${res.data.enrolled} student${res.data.enrolled !== 1 ? 's' : ''}`);
      if (res.data.already_enrolled.length > 0) {
        toast(`${res.data.already_enrolled.length} already enrolled`, { icon: 'ℹ️' });
      }
      setShowBulkEnrollModal(false);
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to bulk enroll');
    } finally {
      setSaving(false);
    }
  };

  const openRollover = () => {
    if (academicYears.length < 2) {
      return toast.error('Need at least 2 academic years to rollover');
    }
    setRolloverSettings({
      sourceYear: '',
      targetYear: '',
      copyTeachers: true,
      copySubjects: false,
    });
    setShowRolloverModal(true);
  };

  const handleRollover = async () => {
    if (!rolloverSettings.sourceYear || !rolloverSettings.targetYear) {
      return toast.error('Please select both source and target years');
    }
    if (rolloverSettings.sourceYear === rolloverSettings.targetYear) {
      return toast.error('Source and target years must be different');
    }
    setSaving(true);
    try {
      const res = await api.post('/classrooms/rollover_year/', {
        source_year_id: rolloverSettings.sourceYear,
        target_year_id: rolloverSettings.targetYear,
        copy_teachers: rolloverSettings.copyTeachers,
        copy_subjects: rolloverSettings.copySubjects,
      });
      toast.success(`Created ${res.data.created} classrooms for ${res.data.target_year}`);
      setShowRolloverModal(false);
      // Switch to target year
      setSelectedYearId(rolloverSettings.targetYear);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Rollover failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Filter & Group ──────────────────────────────────────────────────────

  const filtered = classes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.teacher_name || '').toLowerCase().includes(q);
    const matchLevel = !filterLevel || c.name.toLowerCase().includes(filterLevel.toLowerCase());
    return matchSearch && matchLevel;
  });

  const grouped = filtered.reduce((acc, cls) => {
    const level = cls.grade_level || GRADE_LEVELS.find(l => cls.name.toLowerCase().includes(l.toLowerCase())) || 'Other';
    if (!acc[level]) acc[level] = [];
    acc[level].push(cls);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => gradeNum(a) - gradeNum(b));
  const selectedYearName = getSelectedYearName();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 space-y-4 sm:space-y-5 md:space-y-6"
    >
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="w-full">
          <div className="flex items-center gap-2 text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Academic Management</span>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Class Management</h1>
          <p className="text-xs text-slate-600 mt-1 font-semibold">
            {classes.length} classroom{classes.length !== 1 ? 's' : ''} in{' '}
            <span className="font-bold text-violet-700">{selectedYearName || '…'}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
          <div className="relative w-full">
            <select
              value={selectedYearId}
              onChange={e => { setSelectedYearId(e.target.value); setSearch(''); setFilterLevel(''); }}
              className="w-full pl-4 pr-10 py-2.5 border border-slate-300 bg-white rounded-md text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all appearance-none cursor-pointer min-w-0"
            >
              {academicYears.length === 0 && <option value="">No years set up</option>}
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>SY {y.name}{y.is_active ? ' ★' : ''}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {isAdmin && (
              <Button variant="secondary" onClick={openRollover} disabled={!selectedYearId || academicYears.length < 2} className="flex-1 sm:flex-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Year Rollover</span>
                <span className="sm:hidden">Rollover</span>
              </Button>
            )}
            <Button variant="primary" onClick={openCreate} disabled={!selectedYearId} className="flex-1 sm:flex-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Section
            </Button>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <Card>
        <CardBody className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search sections..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all"
              />
            </div>
            <div className="w-full sm:w-auto">
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all"
              >
                <option value="">All Levels</option>
                {GRADE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* No year warning */}
      {!loading && academicYears.length === 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50">
          <CardBody className="p-5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-bold text-amber-900">No Academic Years Configured</p>
                <p className="text-xs text-amber-700 mt-1">Go to <strong>Settings → Academic Years</strong> to create one before adding classrooms.</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* CONTENT */}
      {loading ? (
        <div className="space-y-4 p-4">
          <Skeleton.PageHeader />
          <Skeleton.Table rows={5} cols={5} hasAvatar />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="p-8 sm:p-12">
            <EmptyState
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              title={search || filterLevel ? 'No Results Found' : `No Classes in ${selectedYearName}`}
              message={search || filterLevel ? 'Try adjusting your filters' : `Click "Add Class" to create the first classroom for ${selectedYearName}`}
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {sortedGroups.map(([level, items]) => (
              <Card key={level} className="border-l-4 border-l-violet-500">
                <CardHeader divider className="bg-slate-50">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-violet-100 flex items-center justify-center font-extrabold text-xs sm:text-sm text-violet-700 border border-violet-200 flex-shrink-0">
                      {gradeNum(level) !== 999 ? gradeNum(level) : level.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base uppercase">{level}</CardTitle>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">{items.length} Classes</p>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  {/* Mobile: Card layout */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {items.map(cls => (
                      <div key={cls.id} className="p-4 space-y-3">
                        {/* Top: Grade badge + Section name + Student count */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm border border-violet-700 flex-shrink-0">
                              {gradeNum(cls.name) !== 999 ? gradeNum(cls.name) : cls.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm leading-tight break-words">{cls.name}</p>
                              {cls.teacher_name && (
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                  <span className="truncate">{cls.teacher_name}</span>
                                </p>
                              )}
                              {!cls.teacher_name && (
                                <p className="text-xs text-slate-400 italic mt-0.5">Not assigned</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="violet" size="sm" className="flex-shrink-0 font-extrabold">
                            {cls.student_count ?? 0}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openSubjectPanel(cls)} className="flex-1 text-xs">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253" /></svg>
                            Subjects
                          </Button>
                          {isAdmin && (
                            <Button variant="secondary" size="sm" onClick={() => openBulkEnroll(cls)} className="flex-1 text-xs">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                              Enroll
                            </Button>
                          )}
                          <button onClick={() => openEdit(cls)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(cls)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table layout */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Class</th>
                          <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Adviser</th>
                          <th className="text-center px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Students</th>
                          <th className="text-center px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(cls => (
                          <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm border border-violet-700">
                                  {gradeNum(cls.name) !== 999 ? gradeNum(cls.name) : cls.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-900 text-sm">{cls.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {cls.teacher_name || <span className="text-slate-400 italic">Not assigned</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="violet" size="md" className="font-extrabold">
                                {cls.student_count ?? 0}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                {isAdmin && (
                                  <Button variant="secondary" size="sm" onClick={() => openBulkEnroll(cls)}>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                    Enroll
                                  </Button>
                                )}
                                <Button variant="secondary" size="sm" onClick={() => openSubjectPanel(cls)}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253" /></svg>
                                  Subjects
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => openEdit(cls)}>Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(cls)}>Delete</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
          <p className="text-xs text-slate-500 font-semibold text-center">
            Showing {filtered.length} of {classes.length} classes in {selectedYearName}
          </p>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CLASSROOM MODAL */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
        <ModalHeader onClose={() => setShowModal(false)}>
          <ModalTitle title={editingClass ? 'Edit Classroom' : 'Add New Classroom'} subtitle={`Academic Year ${selectedYearName}`} />
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div className="space-y-4">
              <ModalField label="Grade Level" required>
                <select
                  value={formData.grade_level}
                  onChange={e => { const level = e.target.value; setFormData(prev => ({ ...prev, grade_level: level, name: prev.name || level + ' - ' })); }}
                  className={modalSelectCls} required
                >
                  <option value="">— Select Grade Level —</option>
                  {GRADE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </ModalField>
              <ModalField label="Class / Section Name" required hint='Example: "Grade 7 - Rizal" or "Grade 11 - Academic A"'>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Grade 7 - Rizal" className={modalInputCls} required />
              </ModalField>
              <ModalField label="Adviser / Class Teacher" hint="Teachers can advise multiple classrooms.">
                <select value={formData.teacher || ''} onChange={e => setFormData({ ...formData, teacher: e.target.value })} className={modalSelectCls}>
                  <option value="">— No Adviser Assigned —</option>
                  {teachers.map(t => {
                    const otherClasses = classes.filter(c => c.teacher === t.id && c.id !== editingClass?.id);
                    const advisingOthers = otherClasses.length > 0;
                    const otherClassNames = otherClasses.map(c => c.name).join(', ');
                    return (
                      <option key={t.id} value={t.id}>
                        {t.first_name && t.last_name ? `${t.first_name} ${t.last_name}` : t.username}
                        {advisingOthers ? ` (Also advising: ${otherClassNames})` : ` — ${t.email}`}
                      </option>
                    );
                  })}
                </select>
              </ModalField>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalBtnSecondary onClick={() => setShowModal(false)}>Cancel</ModalBtnSecondary>
            <ModalBtnPrimary loading={saving}>{editingClass ? 'Update Classroom' : 'Create Classroom'}</ModalBtnPrimary>
          </ModalFooter>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SUBJECT ASSIGNMENT SLIDE-OVER PANEL */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showSubjectPanel && selectedClass && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSubjectPanel(false)} />
          <div className="relative w-full sm:max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200 bg-slate-50">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">{selectedClass.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{assignments.length} subject{assignments.length !== 1 ? 's' : ''} assigned</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <button onClick={() => openSubjectModal()} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-md hover:bg-violet-700 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  Assign
                </button>
                <button onClick={() => setShowSubjectPanel(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto">
              {assignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253" />
                  </svg>
                  <p className="text-sm font-bold">No Subjects Assigned</p>
                  <p className="text-xs mt-1">Click "Assign" to add subjects.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assignments.map(a => (
                    <div key={a.id} className="px-4 sm:px-5 py-3 sm:py-4 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-extrabold text-xs border border-violet-200 flex-shrink-0">
                          {a.subject_code?.substring(0, 2).toUpperCase() || 'SB'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{a.subject_name}</p>
                          <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mt-0.5">{a.subject_code}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate">{a.teacher_name}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openSubjectModal(a)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleSubjectDelete(a)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Remove">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SUBJECT ASSIGNMENT MODAL */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg border border-gray-300 shadow-2xl rounded-md flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-200 bg-slate-50">
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">{editingAssignment ? 'Edit Assignment' : 'Assign Subject'}</h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{selectedClass?.name}</p>
              </div>
              <button onClick={() => setShowSubjectModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors flex-shrink-0 ml-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubjectSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Subject</label>
                  {!editingAssignment ? (
                    <>
                      <input type="text" placeholder="Search subjects..." value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 mb-2" />
                      <div className="border border-slate-200 rounded-md overflow-hidden max-h-48 overflow-y-auto">
                        {filteredSubjects.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-xs">No subjects found</div>
                        ) : (
                          filteredSubjects.map(s => {
                            const isAssigned = assignedSubjectIds.has(s.id);
                            const isSelected = String(subjectForm.subject) === String(s.id);
                            return (
                              <button key={s.id} type="button" disabled={isAssigned}
                                onClick={() => !isAssigned && setSubjectForm({ ...subjectForm, subject: String(s.id) })}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm border-b border-slate-100 last:border-0 transition-colors ${isAssigned ? 'opacity-40 cursor-not-allowed bg-slate-50' : isSelected ? 'bg-violet-50 border-violet-200' : 'hover:bg-slate-50'}`}>
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{s.code}</span>
                                <span className="font-medium text-slate-800 truncate">{s.name}</span>
                                {isAssigned && <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase">Assigned</span>}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold text-slate-800">
                      {editingAssignment.subject_name}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Teacher <span className="text-red-500">*</span></label>
                  <select value={subjectForm.teacher} onChange={e => setSubjectForm({ ...subjectForm, teacher: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500" required>
                    <option value="">Select a teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.first_name && t.last_name ? `${t.first_name} ${t.last_name}` : t.username}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-slate-50 flex items-center justify-end gap-2 sm:gap-3">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="px-3 sm:px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-md hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={!subjectForm.subject || !subjectForm.teacher || savingSubject} className="px-3 sm:px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-md hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {savingSubject ? 'Saving...' : editingAssignment ? 'Update' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* BULK ENROLLMENT MODAL */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Modal isOpen={showBulkEnrollModal} onClose={() => setShowBulkEnrollModal(false)} size="lg">
        <ModalHeader onClose={() => setShowBulkEnrollModal(false)}>
          <ModalTitle title="Bulk Enroll Students" subtitle={selectedClass?.name} />
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <p className="text-sm font-bold text-slate-700">
                Select students to enroll ({selectedStudents.length} selected)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudents(availableStudents.map(s => s.id))}
                  className="text-xs font-bold text-violet-600 hover:text-violet-700"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedStudents([])}
                  className="text-xs font-bold text-slate-600 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>
            </div>
            {availableStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm font-bold">No available students</p>
                <p className="text-xs mt-1">All students are already enrolled in this classroom.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-md">
                <div className="divide-y divide-slate-100">
                  {availableStudents.map(student => (
                    <label
                      key={student.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                        className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">
                          {student.first_name && student.last_name
                            ? `${student.first_name} ${student.last_name}`
                            : student.username}
                        </p>
                        <p className="text-xs text-slate-500">{student.email || 'No email'}</p>
                      </div>
                      {student.profile?.grade_level && (
                        <Badge variant="violet" size="sm">
                          {student.profile.grade_level}
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setShowBulkEnrollModal(false)}>Cancel</ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleBulkEnroll} loading={saving} disabled={selectedStudents.length === 0}>
            Enroll {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
          </ModalBtnPrimary>
        </ModalFooter>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* YEAR ROLLOVER MODAL */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Modal isOpen={showRolloverModal} onClose={() => setShowRolloverModal(false)} size="md">
        <ModalHeader onClose={() => setShowRolloverModal(false)}>
          <ModalTitle title="Academic Year Rollover" subtitle="Copy classrooms to new school year" />
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-bold text-blue-900">What is Year Rollover?</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Copies classroom structure from one academic year to another. Students and grades are NOT copied.
                  </p>
                </div>
              </div>
            </div>
            <ModalField label="Source Year" required hint="Copy classrooms FROM this year">
              <select
                value={rolloverSettings.sourceYear}
                onChange={e => setRolloverSettings({ ...rolloverSettings, sourceYear: e.target.value })}
                className={modalSelectCls}
                required
              >
                <option value="">— Select Source Year —</option>
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>SY {y.name}</option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Target Year" required hint="Copy classrooms TO this year">
              <select
                value={rolloverSettings.targetYear}
                onChange={e => setRolloverSettings({ ...rolloverSettings, targetYear: e.target.value })}
                className={modalSelectCls}
                required
              >
                <option value="">— Select Target Year —</option>
                {academicYears.map(y => (
                  <option key={y.id} value={y.id} disabled={y.id === rolloverSettings.sourceYear}>
                    SY {y.name}
                  </option>
                ))}
              </select>
            </ModalField>
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolloverSettings.copyTeachers}
                  onChange={e => setRolloverSettings({ ...rolloverSettings, copyTeachers: e.target.checked })}
                  className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                />
                <span className="text-sm font-bold text-slate-700">Copy teacher/adviser assignments</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolloverSettings.copySubjects}
                  onChange={e => setRolloverSettings({ ...rolloverSettings, copySubjects: e.target.checked })}
                  className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                />
                <span className="text-sm font-bold text-slate-700">Copy subject assignments</span>
              </label>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setShowRolloverModal(false)}>Cancel</ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleRollover} loading={saving}>
            Create Classrooms
          </ModalBtnPrimary>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
};

export default ClassManagement;
