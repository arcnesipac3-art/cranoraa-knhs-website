import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  Card, CardBody, Button, Badge,
  LoadingSpinner, Modal, ModalHeader, ModalBody, ModalFooter,
  ModalTitle, ModalField, ModalBtnPrimary, ModalBtnSecondary,
  modalInputCls, modalSelectCls, modalTextareaCls,
} from '../components/ui';

// ── Constants ───────────────────────────────────────────────────────────────

const JHS_GRADES = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
const SHS_GRADES = ['Grade 11', 'Grade 12'];
const ALL_GRADES  = [...JHS_GRADES, ...SHS_GRADES];

// fix #11: static Tailwind lookup — dynamic template literals break JIT purge
const COLOR_CLASSES = {
  violet: {
    border: 'border-violet-500', bg: 'bg-gradient-to-br from-violet-50 to-violet-100',
    icon: 'bg-violet-100', iconText: 'text-violet-600', check: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border-violet-200', badgeSm: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-600', hero: 'from-violet-500 to-violet-600 shadow-violet-200',
  },
  blue: {
    border: 'border-blue-500', bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    icon: 'bg-blue-100', iconText: 'text-blue-600', check: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200', badgeSm: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500', hero: 'from-blue-500 to-blue-600 shadow-blue-200',
  },
  pink: {
    border: 'border-pink-500', bg: 'bg-gradient-to-br from-pink-50 to-pink-100',
    icon: 'bg-pink-100', iconText: 'text-pink-600', check: 'bg-pink-500',
    badge: 'bg-pink-50 text-pink-700 border-pink-200', badgeSm: 'bg-pink-100 text-pink-700',
    dot: 'bg-pink-500', hero: 'from-pink-500 to-pink-600 shadow-pink-200',
  },
  indigo: {
    border: 'border-indigo-500', bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
    icon: 'bg-indigo-100', iconText: 'text-indigo-600', check: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', badgeSm: 'bg-indigo-100 text-indigo-700',
    dot: 'bg-indigo-500', hero: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
  },
  emerald: {
    border: 'border-emerald-500', bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    icon: 'bg-emerald-100', iconText: 'text-emerald-600', check: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', badgeSm: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500', hero: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
  },
};

const STEPS = [
  { id: 'academic-year',    label: 'Academic Year',   shortLabel: 'Year',    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'education-level',  label: 'Education Level', shortLabel: 'Level',   icon: 'M8 9l4-4 4 4m0 6l-4 4-4-4' },
  { id: 'academic-periods', label: 'Academic Periods',shortLabel: 'Periods', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'sections',         label: 'Sections',        shortLabel: 'Sections',icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'subjects',         label: 'Subjects',        shortLabel: 'Subjects',icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253' },
  { id: 'assign-subjects',  label: 'Assign Subjects', shortLabel: 'Assign',  icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'review',           label: 'Review',          shortLabel: 'Review',  icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { id: 'publish',          label: 'Publish',         shortLabel: 'Publish', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'complete',         label: 'Done',            shortLabel: 'Done',    icon: 'M5 13l4 4L19 7' },
];

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—';

const parseBackendErrors = (err) => {
  const data = err?.response?.data;
  if (!data) return 'An unexpected error occurred';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const messages = [];
  for (const [field, errors] of Object.entries(data)) {
    if (Array.isArray(errors)) messages.push(`${field}: ${errors.join(', ')}`);
    else if (typeof errors === 'string') messages.push(`${field}: ${errors}`);
  }
  return messages.length > 0 ? messages.join(' · ') : 'Failed to save. Check your input.';
};

// ── Main Component ───────────────────────────────────────────────────────────

const AcademicSetup = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState(false);

  // fix #15: per-action saving state — avoids one shared flag disabling wrong buttons
  const [savingAY,      setSavingAY]      = useState(false);
  const [savingSem,     setSavingSem]     = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [savingAssign,  setSavingAssign]  = useState(false);
  const [savingPublish, setSavingPublish] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [academicYears,     setAcademicYears]     = useState([]);
  const [semesters,         setSemesters]         = useState([]);
  const [classrooms,        setClassrooms]        = useState([]);
  const [subjects,          setSubjects]          = useState([]);
  const [teachers,          setTeachers]          = useState([]);
  const [classroomSubjects, setClassroomSubjects] = useState([]);
  const [educationLevel,    setEducationLevel]    = useState('');
  const [subjectSearch,     setSubjectSearch]     = useState('');

  // ── Forms ─────────────────────────────────────────────────────────────────
  const [ayForm,       setAyForm]       = useState({ name: '', start_date: '', end_date: '', is_active: true });
  const [semesterForm, setSemesterForm] = useState({ name: '', semester_type: '1st Term' });
  const [sectionForm,  setSectionForm]  = useState({ name: '', grade_level: '', teacher: '' });
  const [subjectForm,  setSubjectForm]  = useState({ name: '', code: '', description: '', grade_level: '' });
  const [assignForm,   setAssignForm]   = useState({ classroom: '', subject: '', teacher: '' });

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');

  // fix #6: auto-detect step only once on initial load
  const hasAutoDetected = useRef(false);

  // ── Published state helpers ───────────────────────────────────────────────
  // Persisted in localStorage keyed by AY id so re-visits show the Complete step
  const getPublishedAYId = () => {
    try { return localStorage.getItem('academicSetup_publishedAYId'); } catch { return null; }
  };
  const setPublishedAYId = (id) => {
    try { localStorage.setItem('academicSetup_publishedAYId', String(id)); } catch { /* ignore */ }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeAY       = useMemo(() => academicYears.find(y => y.is_active), [academicYears]);
  const availGrades    = useMemo(() => educationLevel === 'jhs' ? JHS_GRADES : educationLevel === 'shs' ? SHS_GRADES : ALL_GRADES, [educationLevel]);
  const activeTeachers = useMemo(() => teachers.filter(t => t.is_active !== false), [teachers]);

  // fix #10: inline subject search
  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    const q = subjectSearch.toLowerCase();
    return subjects.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.grade_level?.toLowerCase().includes(q)
    );
  }, [subjects, subjectSearch]);

  // New DepEd curriculum: both JHS and SHS use 3 terms
  const getDefaultPeriods = useCallback(() => {
    return [
      { name: '1st Term', semester_type: '1st Term' },
      { name: '2nd Term', semester_type: '2nd Term' },
      { name: '3rd Term', semester_type: '3rd Term' },
    ];
  }, []);

  // ── Publish checklist (defined before canAdvance — fix #3) ───────────────
  const publishChecks = useMemo(() => [
    { label: 'Active academic year',          ok: !!activeAY },
    { label: 'Education level selected',      ok: !!educationLevel },
    { label: 'Academic periods configured',   ok: semesters.length > 0 },
    { label: 'Sections created',              ok: classrooms.length > 0 },
    { label: 'Subjects added',                ok: subjects.length > 0 },
    { label: 'Subjects assigned to sections', ok: classroomSubjects.length > 0 },
    { label: 'Active faculty available',      ok: activeTeachers.length > 0 },
  ], [activeAY, educationLevel, semesters, classrooms, subjects, classroomSubjects, activeTeachers]);

  const publishReady = publishChecks.every(c => c.ok);

  // fix #3: review → publish gate requires all checks to pass
  const canAdvance = useMemo(() => {
    switch (STEPS[currentStep]?.id) {
      case 'academic-year':    return !!activeAY;
      case 'education-level':  return !!educationLevel;
      case 'academic-periods': return semesters.length > 0;
      case 'sections':         return classrooms.length > 0;
      case 'subjects':         return subjects.length > 0;
      case 'assign-subjects':  return classroomSubjects.length > 0;
      case 'review':           return publishReady;
      case 'publish':          return false;
      default:                 return true;
    }
  }, [currentStep, activeAY, educationLevel, semesters, classrooms, subjects, classroomSubjects, publishReady]);

  // ── Per-classroom subject map ──────────────────────────────────────────────
  const classroomSubjectMap = useMemo(() => {
    const map = {};
    classroomSubjects.forEach(cs => {
      if (!map[cs.classroom]) map[cs.classroom] = [];
      map[cs.classroom].push(cs);
    });
    return map;
  }, [classroomSubjects]);

  // ── Fetch (fix #4: single bulk fetch instead of N+1 per classroom) ────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [ayRes, subRes, tchRes, settingsRes] = await Promise.all([
        api.get('/admin/academic-years/').catch(() => ({ data: [] })),
        api.get('/subjects/').catch(() => ({ data: [] })),
        api.get('/users/?role=staff').catch(() => ({ data: [] })),
        api.get('/system/settings/').catch(() => ({ data: {} })),
      ]);
      const years = Array.isArray(ayRes.data) ? ayRes.data : [];
      setAcademicYears(years);
      setSubjects(Array.isArray(subRes.data) ? subRes.data : []);
      setTeachers(Array.isArray(tchRes.data) ? tchRes.data : []);
      if (settingsRes.data?.academic_level) setEducationLevel(settingsRes.data.academic_level);

      const ay = years.find(y => y.is_active) || years[0];
      if (ay) {
        const [clsRes, semRes, csRes] = await Promise.all([
          api.get(`/classrooms/?academic_year=${encodeURIComponent(ay.name)}`).catch(() => ({ data: [] })),
          api.get(`/admin/semesters/?academic_year=${ay.id}`).catch(() => ({ data: [] })),
          api.get(`/classroom-subjects/?academic_year_id=${ay.id}`).catch(() => ({ data: [] })),
        ]);
        const cls = Array.isArray(clsRes.data) ? clsRes.data : [];
        const sems = Array.isArray(semRes.data) ? semRes.data : [];
        let cs = Array.isArray(csRes.data) ? csRes.data : [];

        // Fallback: if bulk AY fetch returned nothing but classrooms exist,
        // some classrooms may not have academic_year set — fetch without filter
        if (cs.length === 0 && cls.length > 0) {
          const fallbackRes = await api.get('/classroom-subjects/').catch(() => ({ data: [] }));
          const all = Array.isArray(fallbackRes.data) ? fallbackRes.data : [];
          // Filter to only classrooms in this AY
          const clsIds = new Set(cls.map(c => c.id));
          cs = all.filter(item => clsIds.has(item.classroom));
        }

        setClassrooms(cls);
        setSemesters(sems);
        setClassroomSubjects(cs);
      } else {
        setClassrooms([]); setSemesters([]); setClassroomSubjects([]);
      }
    } catch (err) {
      console.error('[AcademicSetup] fetchData error:', err);
      setFetchError(true);
      toast.error('Failed to load setup data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // fix #6: auto-detect step only once on first successful load
  // fix: if this AY was already published (stored in localStorage), go straight to Complete
  useEffect(() => {
    if (loading || fetchError || hasAutoDetected.current) return;
    hasAutoDetected.current = true;
    const ay = academicYears.find(y => y.is_active);
    if (!ay)                            { setCurrentStep(0); return; }
    // If we previously published this exact AY, jump straight to Complete
    if (getPublishedAYId() === String(ay.id)) { setCurrentStep(8); return; }
    if (!educationLevel)                { setCurrentStep(1); return; }
    if (semesters.length === 0)         { setCurrentStep(2); return; }
    if (classrooms.length === 0)        { setCurrentStep(3); return; }
    if (subjects.length === 0)          { setCurrentStep(4); return; }
    if (classroomSubjects.length === 0) { setCurrentStep(5); return; }
    setCurrentStep(6);
  }, [loading, fetchError, academicYears, educationLevel, semesters, classrooms, subjects, classroomSubjects]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  // fix #1: validate date range before API call
  const handleCreateAY = async (e) => {
    e.preventDefault();
    if (!ayForm.name.trim()) return toast.error('Year name is required');
    if (ayForm.start_date && ayForm.end_date && ayForm.end_date <= ayForm.start_date)
      return toast.error('End date must be after start date');
    setSavingAY(true);
    try {
      await api.post('/admin/academic-years/', ayForm);
      toast.success('Academic year created');
      setShowModal(false);
      setAyForm({ name: '', start_date: '', end_date: '', is_active: true });
      fetchData();
    } catch (err) { toast.error(parseBackendErrors(err), { duration: 6000 }); }
    finally { setSavingAY(false); }
  };

  const handleActivateAY = async (id) => {
    try {
      await api.post(`/admin/academic-years/${id}/activate/`);
      toast.success('Academic year activated');
      fetchData();
    } catch (err) { toast.error(parseBackendErrors(err)); }
  };

  // fix #7: warn when changing education level after data already exists
  const handleSelectEducationLevel = async () => {
    if (!educationLevel) return toast.error('Select an education level');
    if (semesters.length > 0 || classrooms.length > 0) {
      const result = await Swal.fire({
        title: 'Change Education Level?',
        html: '<p class="text-sm text-slate-600">Existing periods and sections were configured for the previous level. They will not be deleted automatically — review them after saving.</p>',
        icon: 'warning', showCancelButton: true,
        confirmButtonText: 'Change Anyway', confirmButtonColor: '#7c3aed',
        cancelButtonColor: '#64748b', customClass: { popup: 'rounded-2xl' },
      });
      if (!result.isConfirmed) return;
    }
    try {
      await api.patch('/system/settings/', { academic_level: educationLevel });
      toast.success(`Education level set to ${educationLevel === 'jhs' ? 'Junior High School' : educationLevel === 'shs' ? 'Senior High School' : 'Both JHS & SHS'}`);
      goToNextStep();
    } catch (err) { toast.error(parseBackendErrors(err), { duration: 6000 }); }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    if (!semesterForm.name.trim()) return toast.error('Period name is required');
    setSavingSem(true);
    try {
      await api.post('/admin/semesters/', {
        name: semesterForm.name.trim(), academic_year: activeAY?.id,
        semester_type: semesterForm.semester_type, start_date: null, end_date: null,
      });
      toast.success('Period created');
      setShowModal(false);
      setSemesterForm({ name: '', semester_type: '1st Term' });
      fetchData();
    } catch (err) { toast.error(parseBackendErrors(err), { duration: 6000 }); }
    finally { setSavingSem(false); }
  };

  // fix #2: parallel creation with Promise.allSettled + robust duplicate detection
  const handleQuickCreatePeriods = async () => {
    const defaults = getDefaultPeriods();
    if (!defaults.length) return;
    setSavingSem(true);
    try {
      const results = await Promise.allSettled(
        defaults.map(p => api.post('/admin/semesters/', {
          name: p.name, academic_year: activeAY?.id,
          semester_type: p.semester_type, start_date: null, end_date: null,
        }))
      );
      const failed = [];
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const msg = parseBackendErrors(r.reason);
          if (!msg.toLowerCase().includes('already') && !msg.toLowerCase().includes('unique'))
            failed.push(`${defaults[i].name}: ${msg}`);
        }
      });
      if (failed.length) toast.error(`Some periods failed:\n${failed.join('\n')}`, { duration: 8000 });
      else toast.success(`${defaults.length} period(s) ready`);
      fetchData();
    } catch (err) {
      console.error('[AcademicSetup] quickCreatePeriods error:', err);
      toast.error('Failed to create periods');
    } finally { setSavingSem(false); }
  };

  const handleDeleteSemester = async (id) => {
    const result = await Swal.fire({
      title: 'Delete period?', icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', confirmButtonText: 'Delete',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/admin/semesters/${id}/`);
      toast.success('Period deleted'); fetchData();
    } catch (err) {
      // fix #16: use parseBackendErrors, never swallow silently
      toast.error(parseBackendErrors(err));
      console.error('[AcademicSetup] deleteSemester error:', err);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!sectionForm.name.trim()) return toast.error('Section name is required');
    if (!sectionForm.grade_level) return toast.error('Grade level is required');
    setSavingSection(true);
    try {
      await api.post('/classrooms/', {
        name: sectionForm.name.trim(), grade_level: sectionForm.grade_level,
        teacher: sectionForm.teacher || null, academic_year: activeAY?.id || null,
      });
      toast.success('Section created');
      setShowModal(false);
      setSectionForm({ name: '', grade_level: '', teacher: '' });
      fetchData();
    } catch (err) { toast.error(parseBackendErrors(err), { duration: 6000 }); }
    finally { setSavingSection(false); }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) return toast.error('Subject name is required');
    if (!subjectForm.code.trim()) return toast.error('Subject code is required');
    if (!subjectForm.grade_level) return toast.error('Grade level is required');
    setSavingSubject(true);
    try {
      await api.post('/subjects/', subjectForm);
      toast.success('Subject created');
      setShowModal(false);
      setSubjectForm({ name: '', code: '', description: '', grade_level: '' });
      fetchData();
    } catch (err) { toast.error(parseBackendErrors(err), { duration: 6000 }); }
    finally { setSavingSubject(false); }
  };

  const handleAssignSubject = async (e) => {
    e.preventDefault();
    if (!assignForm.classroom) return toast.error('Select a section');
    if (!assignForm.subject)   return toast.error('Select a subject');
    if (!assignForm.teacher)   return toast.error('Select a teacher');
    setSavingAssign(true);
    try {
      await api.post('/classroom-subjects/', {
        classroom: parseInt(assignForm.classroom),
        subject:   parseInt(assignForm.subject),
        teacher:   parseInt(assignForm.teacher),
      });
      toast.success('Subject assigned');
      setShowModal(false);
      setAssignForm({ classroom: '', subject: '', teacher: '' });
      fetchData();
    } catch (err) { toast.error(parseBackendErrors(err), { duration: 6000 }); }
    finally { setSavingAssign(false); }
  };

  const handleRemoveAssignment = async (id) => {
    const result = await Swal.fire({
      title: 'Remove assignment?', icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', confirmButtonText: 'Remove',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/classroom-subjects/${id}/`);
      toast.success('Assignment removed'); fetchData();
    } catch (err) {
      toast.error(parseBackendErrors(err));
      console.error('[AcademicSetup] removeAssignment error:', err);
    }
  };

  // fix #18: surface second-step failure; fix #5: no silent .catch(()=>{})
  const handlePublish = async () => {
    if (!activeAY) return toast.error('No active academic year');
    const result = await Swal.fire({
      title: 'Publish Academic Setup?',
      html: `<p class="text-sm text-slate-600">This will activate <strong>SY ${activeAY.name}</strong> and make the configuration live for students and faculty.</p>`,
      icon: 'question', showCancelButton: true,
      confirmButtonText: 'Yes, Publish', confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#64748b', customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    setSavingPublish(true);
    try {
      await api.post(`/admin/academic-years/${activeAY.id}/activate/`);
      try {
        await api.patch('/system/settings/', { current_quarter: '1' });
      } catch (patchErr) {
        console.warn('[AcademicSetup] current_term patch failed (non-critical):', patchErr);
        toast('Note: Could not set current term to 1 — set it manually in Settings.', { icon: '⚠️' });
      }
      // Persist published state so re-visits go straight to Complete step
      setPublishedAYId(activeAY.id);
      toast.success('Academic setup published — SY ' + activeAY.name + ' is now active');
      goToNextStep();
    } catch (err) { toast.error(parseBackendErrors(err)); }
    finally { setSavingPublish(false); }
  };

  const goToNextStep = () => { if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1); };
  const goToPrevStep = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };
  const openModal    = (type) => { setModalType(type); setShowModal(true); };
  const getStepStatus = (idx) => idx < currentStep ? 'completed' : idx === currentStep ? 'current' : 'upcoming';

  // Clear published flag and reset to step 0 for a new school year setup
  const handleStartNewYear = () => {
    try { localStorage.removeItem('academicSetup_publishedAYId'); } catch { /* ignore */ }
    hasAutoDetected.current = false;
    setCurrentStep(0);
  };

  // fix #17: retry button on fetch failure
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <LoadingSpinner />
      <p className="text-xs font-semibold text-slate-500">Loading setup data…</p>
    </div>
  );

  if (fetchError) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
        <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div>
        <p className="font-bold text-slate-800">Failed to load setup data</p>
        <p className="text-xs text-slate-500 mt-1">Check your connection or try again.</p>
      </div>
      <Button variant="primary" onClick={fetchData}>Retry</Button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="page-bottom-safe max-w-[1200px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5"
    >
      {/* ── Portal-style header ── */}
      <div className="bg-white border-b border-slate-200 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 py-3 md:py-4 mb-2 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">Academic Setup</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Setup Wizard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeAY && (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-xs font-bold text-violet-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                SY {activeAY.name}
              </span>
            )}
            <button onClick={() => navigate('/classes')} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">Classes</button>
            <button onClick={() => navigate('/subjects')} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">Subjects</button>
          </div>
        </div>
      </div>

      {/* ── Step progress bar (fix #14: proper aria) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4 shadow-sm overflow-hidden">
        <div role="tablist" aria-label="Setup wizard steps" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STEPS.map((step, idx) => {
            const status = getStepStatus(idx);
            return (
              <button key={step.id} type="button"
                role="tab"
                aria-selected={status === 'current'}
                aria-current={status === 'current' ? 'step' : undefined}
                aria-label={`Step ${idx + 1}: ${step.label}${status === 'completed' ? ' (completed)' : ''}`}
                onClick={() => idx <= currentStep && setCurrentStep(idx)}
                disabled={idx > currentStep}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  status === 'current'   ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-200' :
                  status === 'completed' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer border border-emerald-200' :
                                          'bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                  status === 'completed' ? 'bg-emerald-500 text-white' :
                  status === 'current'   ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {status === 'completed'
                    ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    : idx + 1}
                </span>
                <span className="hidden lg:inline">{step.label}</span>
                <span className="lg:hidden">{step.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs lg:hidden">
          <span className="text-slate-500 font-semibold">Step {currentStep + 1} of {STEPS.length}</span>
          <span className="font-bold text-violet-600">{STEPS[currentStep].label}</span>
        </div>
      </div>

      {/* ── Step content (fix #12: named step components) ── */}
      <AnimatePresence mode="wait">
        <motion.div key={currentStep}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}>
          <Card className="shadow-sm">
            <CardBody className="p-5 md:p-8">
              <StepContent
                stepId={STEPS[currentStep].id}
                activeAY={activeAY} academicYears={academicYears} semesters={semesters}
                classrooms={classrooms} subjects={subjects} filteredSubjects={filteredSubjects}
                subjectSearch={subjectSearch} setSubjectSearch={setSubjectSearch}
                classroomSubjects={classroomSubjects} classroomSubjectMap={classroomSubjectMap}
                activeTeachers={activeTeachers} educationLevel={educationLevel}
                setEducationLevel={setEducationLevel} availGrades={availGrades}
                publishChecks={publishChecks} publishReady={publishReady}
                savingSem={savingSem} savingPublish={savingPublish}
                onOpenModal={openModal} onActivateAY={handleActivateAY}
                onSelectEducationLevel={handleSelectEducationLevel}
                onQuickCreatePeriods={handleQuickCreatePeriods}
                onDeleteSemester={handleDeleteSemester}
                onRemoveAssignment={handleRemoveAssignment}
                onPublish={handlePublish} onNavigate={navigate}
                onStartNewYear={handleStartNewYear}
              />
            </CardBody>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <Button variant="secondary" size="sm" onClick={goToPrevStep} disabled={currentStep === 0}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Previous
        </Button>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {STEPS.map((_, idx) => (
            <div key={idx} className={`rounded-full transition-all duration-300 ${
              idx === currentStep ? 'w-5 h-2 bg-violet-600' :
              idx < currentStep  ? 'w-2 h-2 bg-emerald-400' : 'w-2 h-2 bg-slate-200'
            }`} />
          ))}
        </div>
        {STEPS[currentStep].id !== 'publish' && currentStep < STEPS.length - 1 ? (
          <Button variant="primary" size="sm" onClick={goToNextStep} disabled={!canAdvance}>
            {canAdvance ? 'Next' : 'Complete step first'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Button>
        ) : STEPS[currentStep].id === 'complete' ? (
          <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        ) : (
          <div className="w-28" />
        )}
      </div>

      {/* ── Modals (fix #13: individual modal components) ── */}
      <AYModal isOpen={showModal && modalType === 'academic-year'} onClose={() => setShowModal(false)} form={ayForm} setForm={setAyForm} onSubmit={handleCreateAY} saving={savingAY} />
      <SemesterModal isOpen={showModal && modalType === 'semester'} onClose={() => setShowModal(false)} form={semesterForm} setForm={setSemesterForm} onSubmit={handleCreateSemester} saving={savingSem} activeAY={activeAY} />
      <SectionModal isOpen={showModal && modalType === 'section'} onClose={() => setShowModal(false)} form={sectionForm} setForm={setSectionForm} onSubmit={handleCreateSection} saving={savingSection} availGrades={availGrades} activeTeachers={activeTeachers} />
      <SubjectModal isOpen={showModal && modalType === 'subject'} onClose={() => setShowModal(false)} form={subjectForm} setForm={setSubjectForm} onSubmit={handleCreateSubject} saving={savingSubject} availGrades={availGrades} />
      <AssignModal isOpen={showModal && modalType === 'assign-subject'} onClose={() => setShowModal(false)} form={assignForm} setForm={setAssignForm} onSubmit={handleAssignSubject} saving={savingAssign} classrooms={classrooms} subjects={subjects} activeTeachers={activeTeachers} />
    </motion.div>
  );
};

export default AcademicSetup;

// ── Shared sub-components ────────────────────────────────────────────────────

// fix #11: uses COLOR_CLASSES lookup — no dynamic Tailwind string interpolation
function StepHero({ icon, color = 'violet', title, desc, badge }) {
  const c = COLOR_CLASSES[color] || COLOR_CLASSES.violet;
  return (
    <div className="text-center max-w-md mx-auto">
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.hero} flex items-center justify-center mx-auto mb-3 shadow-lg`}>
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <h3 className="text-xl font-extrabold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      {badge && (
        <span className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${c.badge}`}>{badge}</span>
      )}
    </div>
  );
}

function EmptyPlaceholder({ icon, text, sub }) {
  return (
    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 max-w-xl mx-auto">
      <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
      </svg>
      <p className="text-sm font-semibold text-slate-500">{text}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Step Content dispatcher (fix #12: named components, no 700-line switch) ──

function StepContent(props) {
  switch (props.stepId) {
    case 'academic-year':    return <StepAcademicYear   {...props} />;
    case 'education-level':  return <StepEducationLevel {...props} />;
    case 'academic-periods': return <StepAcademicPeriods {...props} />;
    case 'sections':         return <StepSections       {...props} />;
    case 'subjects':         return <StepSubjects       {...props} />;
    case 'assign-subjects':  return <StepAssignSubjects {...props} />;
    case 'review':           return <StepReview         {...props} />;
    case 'publish':          return <StepPublish        {...props} />;
    case 'complete':         return <StepComplete       {...props} />;
    default:                 return null;
  }
}

// ── Step: Academic Year ───────────────────────────────────────────────────────

function StepAcademicYear({ academicYears, activeAY, onOpenModal, onActivateAY, onNavigate }) {
  return (
    <div className="space-y-5">
      <StepHero icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" color="violet"
        title="Academic Year" desc="Create and activate the school year (e.g. 2026-2027). Only one year can be active at a time." />
      {academicYears.length > 0 ? (
        <div className="space-y-2 max-w-xl mx-auto">
          {academicYears.map(y => (
            <div key={y.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${y.is_active ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-sm shrink-0 ${y.is_active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {y.name?.slice(0, 4) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900">SY {y.name}</p>
                <p className="text-xs text-slate-500">{fmtDate(y.start_date)} – {fmtDate(y.end_date)}</p>
              </div>
              {y.is_active
                ? <Badge variant="violet">Active</Badge>
                : <button onClick={() => onActivateAY(y.id)} className="px-3 py-1.5 text-xs font-bold text-violet-700 bg-white border border-violet-300 rounded-lg hover:bg-violet-50 transition-colors">Activate</button>
              }
            </div>
          ))}
        </div>
      ) : (
        <EmptyPlaceholder icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" text="No academic years yet" sub="Create your first to get started" />
      )}
      <div className="flex justify-center gap-3">
        <Button variant="primary" onClick={() => onOpenModal('academic-year')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          {academicYears.length > 0 ? 'Add Another Year' : 'Create Academic Year'}
        </Button>
        {activeAY && (
          <Button variant="ghost" size="sm" onClick={() => onNavigate('/classes')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            Manage Classes
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Step: Education Level ─────────────────────────────────────────────────────

function StepEducationLevel({ educationLevel, setEducationLevel, onSelectEducationLevel }) {
  return (
    <div className="space-y-5">
      <StepHero icon="M8 9l4-4 4 4m0 6l-4 4-4-4" color="indigo"
        title="Education Level" desc="Choose the level for this academic year. This auto-selects grade levels and period structure." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
        {[
          { id: 'jhs', label: 'Junior High School', sub: 'Grade 7 – Grade 10', badge: '3 Terms', color: 'blue',  grades: JHS_GRADES },
          { id: 'shs', label: 'Senior High School', sub: 'Grade 11 – Grade 12', badge: '3 Terms', color: 'pink', grades: SHS_GRADES },
          { id: 'both', label: 'Both JHS & SHS', sub: 'Grade 7 – Grade 12', badge: '3 Terms', color: 'emerald', grades: ALL_GRADES },
        ].map(opt => {
          const active = educationLevel === opt.id;
          const c = COLOR_CLASSES[opt.color];
          return (
            <button key={opt.id} type="button" aria-pressed={active}
              onClick={() => setEducationLevel(opt.id)}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-200 ${active ? `${c.border} ${c.bg} shadow-lg` : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'}`}>
              {active && (
                <div className={`absolute top-3 right-3 w-6 h-6 rounded-full ${c.check} flex items-center justify-center`}>
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
              <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center mb-3`}>
                <svg className={`w-6 h-6 ${c.iconText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253" />
                </svg>
              </div>
              <h4 className="font-extrabold text-slate-900 mb-0.5">{opt.label}</h4>
              <p className="text-xs text-slate-500 font-semibold">{opt.sub}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${c.badgeSm}`}>{opt.badge}</span>
                {opt.grades.map(g => (
                  <span key={g} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{g}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-slate-400 italic max-w-sm mx-auto">Grade levels are automatically configured based on this selection.</p>
      <div className="flex justify-center">
        <Button variant="primary" onClick={onSelectEducationLevel} disabled={!educationLevel}>
          Continue with {educationLevel === 'jhs' ? 'Junior High' : educationLevel === 'shs' ? 'Senior High' : educationLevel === 'both' ? 'Both JHS & SHS' : '…'}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Button>
      </div>
    </div>
  );
}

// ── Step: Academic Periods ────────────────────────────────────────────────────

// New curriculum: both JHS and SHS use 3 terms
function StepAcademicPeriods({ semesters, savingSem, onOpenModal, onQuickCreatePeriods, onDeleteSemester }) {
  const c = COLOR_CLASSES['blue'];
  return (
    <div className="space-y-5">
      <StepHero icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color="blue"
        title="Configure 3 Terms"
        desc="Set up the 3 grading terms for this academic year. Both JHS and SHS follow the new 3-term curriculum."
        badge="3 Terms (New Curriculum)" />
      {semesters.length > 0 ? (
        <div className="space-y-2 max-w-xl mx-auto">
          {semesters.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shrink-0 ${c.dot}`}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900">{s.name}</p>
                <p className="text-xs text-slate-500">
                  {s.start_date ? `${fmtDate(s.start_date)} – ${fmtDate(s.end_date)}` : 'Dates not set'}
                  {s.is_active && <span className="ml-2 text-emerald-600 font-bold">· Active</span>}
                </p>
              </div>
              <button onClick={() => onDeleteSemester(s.id)} aria-label={`Delete ${s.name}`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPlaceholder icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" text="No terms yet"
          sub="Create 3 terms or use Quick Setup" />
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {semesters.length === 0 && (
          <Button variant="primary" onClick={onQuickCreatePeriods} disabled={savingSem}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Quick Setup (3 Terms)
          </Button>
        )}
        <Button variant="secondary" onClick={() => onOpenModal('semester')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Add Term Manually
        </Button>
      </div>
    </div>
  );
}

// ── Step: Sections ────────────────────────────────────────────────────────────

function StepSections({ classrooms, educationLevel, classroomSubjectMap, onOpenModal, onNavigate }) {
  const byGrade = {};
  classrooms.forEach(c => { const g = c.grade_level || 'Unassigned'; if (!byGrade[g]) byGrade[g] = []; byGrade[g].push(c); });
  const gradeOrder = ['Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','Unassigned'];
  const sortedGrades = Object.keys(byGrade).sort((a, b) => {
    const ia = gradeOrder.indexOf(a), ib = gradeOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return (
    <div className="space-y-5">
      <StepHero icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        color="violet" title="Create Sections"
        desc={`Set up sections for each ${educationLevel === 'jhs' ? 'Grade 7–10' : educationLevel === 'shs' ? 'Grade 11–12' : 'Grade 7–12'} level. Each section will have subjects assigned in the next steps.`} />
      {classrooms.length > 0 ? (
        <div className="space-y-4 max-w-xl mx-auto">
          {sortedGrades.map(grade => (
            <div key={grade}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{grade}</span>
                <span className="text-xs font-bold text-slate-400">({byGrade[grade].length})</span>
              </div>
              <div className="space-y-2">
                {byGrade[grade].map(c => {
                  const subjectCount = (classroomSubjectMap[c.id] || []).length;
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-sm">
                        {c.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.student_count ?? 0} students · {c.teacher_name || 'No adviser'}</p>
                      </div>
                      {subjectCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">{subjectCount} subj.</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPlaceholder icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" text="No sections yet" sub="Create sections for your grade levels" />
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={() => onOpenModal('section')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Add Section
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('/classes')}>Open Classes Manager →</Button>
      </div>
    </div>
  );
}

// ── Step: Subjects (fix #10: inline search) ───────────────────────────────────

function StepSubjects({ subjects, filteredSubjects, subjectSearch, setSubjectSearch, availGrades, onOpenModal, onNavigate }) {
  return (
    <div className="space-y-5">
      <StepHero icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253"
        color="violet" title="Create Subjects" desc={`Add subjects for ${availGrades.join(', ')}. Each subject must have a unique code.`} />
      {subjects.length > 0 && (
        <div className="max-w-xl mx-auto">
          <label htmlFor="subject-search" className="sr-only">Search subjects</label>
          <input id="subject-search" type="search" value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)}
            placeholder="Search by name, code, or grade…"
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
      )}
      {filteredSubjects.length > 0 ? (
        <div className="space-y-2 max-w-xl mx-auto">
          {filteredSubjects.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-bold text-xs text-slate-600 shrink-0">{s.code?.slice(0,4) || '—'}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">{s.name}</p>
                <p className="text-xs text-slate-500">{s.grade_level || 'All levels'}</p>
              </div>
            </div>
          ))}
          {!subjectSearch && subjects.length > 12 && (
            <button onClick={() => onNavigate('/subjects')} className="w-full text-center text-xs font-bold text-violet-600 hover:underline py-2">
              {subjects.length} total · Open Subjects Manager →
            </button>
          )}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyPlaceholder icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" text="No subjects yet" sub="Add subjects to the curriculum" />
      ) : (
        <p className="text-center text-xs text-slate-400 py-4">No subjects match your search</p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={() => onOpenModal('subject')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Add Subject
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('/subjects')}>Open Subjects Manager →</Button>
      </div>
    </div>
  );
}

// ── Step: Assign Subjects ─────────────────────────────────────────────────────

function StepAssignSubjects({ classroomSubjects, onOpenModal, onRemoveAssignment, onNavigate }) {
  return (
    <div className="space-y-5">
      <StepHero icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        color="violet" title="Assign Subjects to Sections"
        desc="Link subjects to sections and assign a teacher for each. A section must have at least one subject before teachers can grade." />
      {classroomSubjects.length > 0 ? (
        <div className="space-y-2 max-w-xl mx-auto">
          {classroomSubjects.slice(0, 20).map(cs => (
            <div key={cs.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-extrabold text-xs shrink-0">
                {cs.classroom_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">{cs.subject_name}</p>
                <p className="text-xs text-slate-500 truncate">{cs.classroom_name} · {cs.teacher_name || 'No teacher'}</p>
              </div>
              <button onClick={() => onRemoveAssignment(cs.id)} aria-label={`Remove ${cs.subject_name} from ${cs.classroom_name}`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          {classroomSubjects.length > 20 && (
            <button onClick={() => onNavigate('/subjects?tab=assignments')} className="w-full text-center text-xs font-bold text-violet-600 hover:underline py-2">
              + {classroomSubjects.length - 20} more · Open Assignments Manager →
            </button>
          )}
        </div>
      ) : (
        <EmptyPlaceholder icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" text="No assignments yet" sub="Assign subjects to your sections" />
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={() => onOpenModal('assign-subject')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Assign Subject
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('/subjects?tab=assignments')}>Open Assignments Manager →</Button>
      </div>
    </div>
  );
}

// ── Step: Review ─────────────────────────────────────────────────────────────

function StepReview({ classrooms, classroomSubjectMap, onNavigate }) {
  return (
    <div className="space-y-5">
      <StepHero icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        color="emerald" title="Review Configuration" desc="Review all sections and their subject-teacher assignments before publishing." />
      {classrooms.length === 0 ? (
        <EmptyPlaceholder icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" text="No sections to review" sub="Go back and create sections first" />
      ) : (
        <div className="space-y-3 max-w-2xl mx-auto">
          {classrooms.map(c => {
            const assignments = classroomSubjectMap[c.id] || [];
            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-extrabold text-xs shrink-0">
                    {c.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.grade_level || '—'} · {c.student_count ?? 0} students · Adviser: {c.teacher_name || 'None'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${assignments.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {assignments.length} subj.
                  </span>
                </div>
                {assignments.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {assignments.map((a, i) => (
                      <div key={a.id ?? i} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-[10px] font-bold text-slate-400 w-5 text-right shrink-0">{i + 1}</span>
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-mono text-[10px] font-bold text-slate-600 shrink-0">{a.subject_code?.slice(0,4) || '—'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{a.subject_name}</p>
                        </div>
                        <p className="text-xs text-slate-500 truncate shrink-0 max-w-[120px]">{a.teacher_name || <span className="text-amber-500">No teacher</span>}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 flex items-center gap-2 text-xs text-amber-600 font-semibold">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    No subjects assigned — go back to Step 5 to assign subjects
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('/subjects?tab=assignments')}>Open Assignments Manager →</Button>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('/classes')}>Open Classes Manager →</Button>
      </div>
    </div>
  );
}

// ── Step: Publish ─────────────────────────────────────────────────────────────

function StepPublish({ publishChecks, publishReady, savingPublish, onPublish }) {
  return (
    <div className="space-y-5">
      <StepHero icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="emerald"
        title="Publish Academic Setup" desc="Review the checklist below. All required items must pass before you can publish." />
      <div className="max-w-lg mx-auto space-y-2">
        {publishChecks.map((check, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${check.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${check.ok ? 'bg-emerald-500' : 'bg-amber-400'}`}>
              {check.ok
                ? <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" /></svg>}
            </div>
            <span className={`text-sm font-semibold ${check.ok ? 'text-emerald-800' : 'text-amber-800'}`}>{check.label}</span>
          </div>
        ))}
      </div>
      {!publishReady && (
        <div className="max-w-lg mx-auto p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-xs text-amber-700 font-semibold">Complete all required steps before publishing. Go back to fix any missing items.</p>
        </div>
      )}
      <div className="flex justify-center">
        <Button variant="primary" onClick={onPublish} disabled={savingPublish || !publishReady}>
          {savingPublish
            ? <><svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Publishing…</>
            : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Publish Academic Setup</>}
        </Button>
      </div>
    </div>
  );
}

// ── Step: Complete ────────────────────────────────────────────────────────────

function StepComplete({ activeAY, classrooms, subjects, activeTeachers, onNavigate, onStartNewYear }) {
  return (
    <div className="space-y-6 text-center py-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      </div>
      <div>
        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Academic Setup Complete!</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto"><span className="font-bold text-violet-700">SY {activeAY?.name}</span> is active and published.</p>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
        <div className="p-4 bg-violet-50 rounded-xl border border-violet-200"><p className="text-2xl font-extrabold text-violet-700">{classrooms.length}</p><p className="text-xs font-semibold text-violet-600 mt-1">Sections</p></div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200"><p className="text-2xl font-extrabold text-emerald-700">{subjects.length}</p><p className="text-xs font-semibold text-emerald-600 mt-1">Subjects</p></div>
        <div className="p-4 bg-sky-50 rounded-xl border border-sky-200"><p className="text-2xl font-extrabold text-sky-700">{activeTeachers.length}</p><p className="text-xs font-semibold text-sky-600 mt-1">Faculty</p></div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={() => onNavigate('/dashboard')}>Go to Dashboard</Button>
        <Button variant="secondary" onClick={() => onNavigate('/classes')}>Manage Classes</Button>
        <Button variant="secondary" onClick={() => onNavigate('/subjects')}>Manage Subjects</Button>
      </div>
      <div className="pt-2 border-t border-slate-100">
        <button onClick={onStartNewYear} className="text-xs text-slate-400 hover:text-violet-600 font-semibold transition-colors">
          Setting up a new school year? Start fresh →
        </button>
      </div>
    </div>
  );
}

// ── Modal Components (fix #13: each modal is its own component) ───────────────

function AYModal({ isOpen, onClose, form, setForm, onSubmit, saving }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}><ModalTitle title="Create Academic Year" subtitle='e.g. "2026-2027"' /></ModalHeader>
      <form onSubmit={onSubmit}>
        <ModalBody>
          <div className="space-y-4">
            <ModalField label="Year Name" required hint='Format: "YYYY-YYYY"'>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="2026-2027" className={modalInputCls} required />
            </ModalField>
            <div className="grid grid-cols-2 gap-4">
              <ModalField label="Start Date" required>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className={modalInputCls} required />
              </ModalField>
              <ModalField label="End Date" required>
                <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={e => setForm({ ...form, end_date: e.target.value })} className={modalInputCls} required />
              </ModalField>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500" />
              <span className="text-sm font-bold text-slate-700">Set as Active Year</span>
            </label>
          </div>
        </ModalBody>
        <ModalFooter><ModalBtnSecondary onClick={onClose}>Cancel</ModalBtnSecondary><ModalBtnPrimary loading={saving}>Create</ModalBtnPrimary></ModalFooter>
      </form>
    </Modal>
  );
}

function SemesterModal({ isOpen, onClose, form, setForm, onSubmit, saving, activeAY }) {
  // New curriculum: both JHS and SHS use 3 terms
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}><ModalTitle title="Add Term" subtitle={`For SY ${activeAY?.name || '—'}`} /></ModalHeader>
      <form onSubmit={onSubmit}>
        <ModalBody>
          <div className="space-y-4">
            <ModalField label="Term" required>
              <select value={form.semester_type} onChange={e => setForm({ ...form, semester_type: e.target.value, name: e.target.value })} className={modalSelectCls} required>
                <option value="1st Term">1st Term</option>
                <option value="2nd Term">2nd Term</option>
                <option value="3rd Term">3rd Term</option>
              </select>
            </ModalField>
            <ModalField label="Display Name" required hint="Auto-filled from type; override if needed">
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="1st Term" className={modalInputCls} required />
            </ModalField>
          </div>
        </ModalBody>
        <ModalFooter><ModalBtnSecondary onClick={onClose}>Cancel</ModalBtnSecondary><ModalBtnPrimary loading={saving}>Create</ModalBtnPrimary></ModalFooter>
      </form>
    </Modal>
  );
}

function SectionModal({ isOpen, onClose, form, setForm, onSubmit, saving, availGrades, activeTeachers }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}><ModalTitle title="Create Section" subtitle="Add a new classroom section" /></ModalHeader>
      <form onSubmit={onSubmit}>
        <ModalBody>
          <div className="space-y-4">
            <ModalField label="Grade Level" required>
              <select value={form.grade_level} onChange={e => setForm({ ...form, grade_level: e.target.value })} className={modalSelectCls} required>
                <option value="">— Select Grade Level —</option>
                {availGrades.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </ModalField>
            <ModalField label="Section Name" required hint='e.g. "Grade 7 - Rizal"'>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Grade 7 - Rizal" className={modalInputCls} required />
            </ModalField>
            <ModalField label="Advisory Teacher">
              <select value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })} className={modalSelectCls}>
                <option value="">— No Adviser —</option>
                {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </ModalField>
          </div>
        </ModalBody>
        <ModalFooter><ModalBtnSecondary onClick={onClose}>Cancel</ModalBtnSecondary><ModalBtnPrimary loading={saving}>Create</ModalBtnPrimary></ModalFooter>
      </form>
    </Modal>
  );
}

function SubjectModal({ isOpen, onClose, form, setForm, onSubmit, saving, availGrades }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}><ModalTitle title="Create Subject" subtitle="Add a new subject to the curriculum" /></ModalHeader>
      <form onSubmit={onSubmit}>
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ModalField label="Subject Code" required>
                <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MATH7" className={modalInputCls + ' font-mono'} required />
              </ModalField>
              <ModalField label="Grade Level" required>
                <select value={form.grade_level} onChange={e => setForm({ ...form, grade_level: e.target.value })} className={modalSelectCls} required>
                  <option value="">— Select —</option>
                  {availGrades.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </ModalField>
            </div>
            <ModalField label="Subject Name" required>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mathematics" className={modalInputCls} required />
            </ModalField>
            <ModalField label="Description">
              <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description (optional)" className={modalTextareaCls} />
            </ModalField>
          </div>
        </ModalBody>
        <ModalFooter><ModalBtnSecondary onClick={onClose}>Cancel</ModalBtnSecondary><ModalBtnPrimary loading={saving}>Create</ModalBtnPrimary></ModalFooter>
      </form>
    </Modal>
  );
}

function AssignModal({ isOpen, onClose, form, setForm, onSubmit, saving, classrooms, subjects, activeTeachers }) {
  // Filter subjects to the grade level of the selected section for easier selection
  const selectedClassroom = classrooms.find(c => String(c.id) === String(form.classroom));
  const filteredSubjects = selectedClassroom
    ? subjects.filter(s => !s.grade_level || s.grade_level === selectedClassroom.grade_level)
    : subjects;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}><ModalTitle title="Assign Subject to Section" subtitle="Link a subject, section, and teacher" /></ModalHeader>
      <form onSubmit={onSubmit}>
        <ModalBody>
          <div className="space-y-4">
            <ModalField label="Section" required>
              <select value={form.classroom}
                onChange={e => setForm({ ...form, classroom: e.target.value, subject: '' })}
                className={modalSelectCls} required>
                <option value="">— Select Section —</option>
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.grade_level ? ` (${c.grade_level})` : ''}</option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Subject" required>
              <select value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                className={modalSelectCls} required disabled={!form.classroom}>
                <option value="">{form.classroom ? '— Select Subject —' : '— Select a section first —'}</option>
                {filteredSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.code} – {s.name}</option>
                ))}
              </select>
              {form.classroom && filteredSubjects.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No subjects found for this grade level. Add subjects in Step 4.</p>
              )}
            </ModalField>
            <ModalField label="Teacher" required>
              <select value={form.teacher}
                onChange={e => setForm({ ...form, teacher: e.target.value })}
                className={modalSelectCls} required>
                <option value="">— Select Teacher —</option>
                {activeTeachers.map(t => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
            </ModalField>
          </div>
        </ModalBody>
        <ModalFooter><ModalBtnSecondary onClick={onClose}>Cancel</ModalBtnSecondary><ModalBtnPrimary loading={saving}>Assign</ModalBtnPrimary></ModalFooter>
      </form>
    </Modal>
  );
}
