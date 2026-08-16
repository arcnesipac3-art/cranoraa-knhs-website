import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { playSound } from '../utils/sounds';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { 
  Card, CardHeader, CardBody, CardTitle, Button, Badge, 
  Skeleton, EmptyState 
} from '../components/ui';
import { PERFORMANCE_LEVELS, getPerformanceLevel } from '../utils/grading';

/**
 * Grade Input Page - DepEd Academic Style
 * Professional grade entry interface for teachers
 */

const GradeInput = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { settings, periodValues: allPeriodValues, periodShortLabels, periodLabel, isSHS, currentQuarter } = useSystemSettings();

  // Check if we're in embedded mode (iframe)
  const searchParams = new URLSearchParams(location.search);
  const isEmbedded = searchParams.get('embedded') === 'true';
  const embeddedClassroom = searchParams.get('classroom');

  // State
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selClassroom, setSelClassroom] = useState(
    embeddedClassroom || location.state?.classroomId || ''
  );
  const [selSubject, setSelSubject] = useState(location.state?.subjectId || '');
  const [selComponent, setSelComponent] = useState('');
  const [activeSemesters, setActiveSemesters] = useState(null);
  const { academicYear, setAcademicYear } = useActiveAcademicYear();

  const [cells, setCells] = useState({});
  const [existingGrades, setExistingGrades] = useState({});
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activePeriod, setActivePeriod] = useState(undefined); // undefined = loading, null = none

  // Fetch active grading period for the deadline banner
  useEffect(() => {
    api.get('/grading-periods/active/')
      .then(r => setActivePeriod(r.data))
      .catch(() => setActivePeriod(null));
  }, []);

  const inputRefs = useRef({});

  // Fetch active grading periods
  useEffect(() => {
    api.get('/grading-periods/')
      .then(r => {
        const periods = Array.isArray(r.data) ? r.data : (r.data?.results || []);
        const active = periods
          .filter(p => ['open', 'closing_soon'].includes(p.status))
          .map(p => p.quarter)
          .filter(q => q !== null);
        setActiveSemesters(active.length > 0 ? [...new Set(active)].sort() : allPeriodValues);
      })
      .catch(() => setActiveSemesters(allPeriodValues));
  }, [academicYear]);

  // Derive periodValues from active semesters
  const periodValues = activeSemesters || allPeriodValues;

  // selQuarter state — initialized to first active period
  const [selQuarter, setSelQuarter] = useState(() => {
    const q = Number(currentQuarter) || 1;
    return periodValues.includes(q) ? q : periodValues[0] || 1;
  });

  // Reset selQuarter if it's no longer active
  useEffect(() => {
    if (activeSemesters && !activeSemesters.includes(selQuarter)) {
      setSelQuarter(activeSemesters[0] || 1);
    }
  }, [activeSemesters, selQuarter]);

  // Academic year navigation
  const handleYearChange = (dir) => {
    if (!academicYear) return;
    const [start, end] = academicYear.split('-').map(Number);
    const newYear = dir === 'next' ? `${start + 1}-${end + 1}` : `${start - 1}-${end - 1}`;
    setAcademicYear(newYear);
  };

  // Format student name: LAST, FIRST
  const formatName = useCallback((fullName = '') => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return fullName.toUpperCase();
    const last = parts.pop();
    return `${last.toUpperCase()}, ${parts.join(' ').toUpperCase()}`;
  }, []);

  // Load classrooms
  useEffect(() => {
    api.get(`/classrooms/?academic_year=${academicYear}`)
      .then(r => setClassrooms(r.data))
      .catch(() => toast.error('Failed to load classrooms'));
  }, [academicYear]);

  // Load subjects for selected classroom
  useEffect(() => {
    if (!selClassroom) {
      setSubjects([]);
      setStudents([]);
      setCells({});
      setExistingGrades({});
      return;
    }
    api.get(`/classroom-subjects/by_classroom/?classroom_id=${selClassroom}`)
      .then(r => setSubjects(r.data))
      .catch(() => toast.error('Failed to load subjects'));
  }, [selClassroom]);

  // Get selected subject data (including has_components)
  const selectedSubjectData = subjects.find(s => String(s.subject) === String(selSubject));

  // Reset component when subject changes
  useEffect(() => {
    setSelComponent('');
  }, [selSubject]);

  // Load students
  const loadStudents = useCallback(async () => {
    if (!selClassroom) return;
    setLoading(true);
    try {
      const res = await api.get(`/enrollments/?classroom=${selClassroom}`);
      // Sort: Male first, then Female, then by last name
      const sorted = res.data.sort((a, b) => {
        const sexOrder = { 'male': 1, 'female': 2, 'other': 3 };
        const sexA = sexOrder[a.student_sex?.toLowerCase()] || 4;
        const sexB = sexOrder[b.student_sex?.toLowerCase()] || 4;
        
        if (sexA !== sexB) return sexA - sexB;

        const nameA = formatName(a.student_name).toLowerCase();
        const nameB = formatName(b.student_name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setStudents(sorted);
      
      // Initialize cells
      const init = {};
      sorted.forEach(s => { init[s.student] = ''; });
      setCells(init);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [selClassroom, formatName]);

  // Fetch existing grades
  const fetchExistingGrades = useCallback(async () => {
    if (!selClassroom || !selSubject || !selQuarter) {
      setExistingGrades({});
      return;
    }
    try {
      let url = `/grades/?classroom=${selClassroom}&subject=${selSubject}&quarter=${selQuarter}&academic_year=${academicYear}&grade_type=final_grade`;
      if (selComponent) url += `&component=${selComponent}`;
      const res = await api.get(url);
      const map = {};
      res.data.forEach(g => {
        map[g.student] = g;
      });
      setExistingGrades(map);
    } catch (err) {
      console.error('Failed to fetch existing grades', err);
    }
  }, [selClassroom, selSubject, selQuarter, academicYear, selComponent]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { fetchExistingGrades(); }, [fetchExistingGrades]);

  // Handle grade input change
  const handleGradeChange = (studentId, value) => {
    setCells(prev => ({ ...prev, [studentId]: value }));
  };

  // Keyboard navigation
  const handleKeyDown = (e, studentId) => {
    const idx = students.findIndex(s => s.student === studentId);
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = students[idx + 1];
      if (next) {
        inputRefs.current[next.student]?.focus();
        setActive(next.student);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = students[idx - 1];
      if (prev) {
        inputRefs.current[prev.student]?.focus();
        setActive(prev.student);
      }
    }
  };

  // Calculate statistics
  const filled = students.filter(s => cells[s.student] !== '');
  const scores = filled.map(s => parseFloat(cells[s.student])).filter(v => !isNaN(v) && v >= 0 && v <= 100);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : null;
  const highest = scores.length ? Math.max(...scores) : null;
  const lowest = scores.length ? Math.min(...scores) : null;
  const passing = scores.filter(s => s >= 75).length;

  // Sort classrooms by grade level
  const sortedClassrooms = [...classrooms].sort((a, b) => {
    const gradeOrder = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    const getGrade = (name) => gradeOrder.find(g => name.toLowerCase().includes(g.toLowerCase())) || '';
    const gradeA = getGrade(a.name);
    const gradeB = getGrade(b.name);
    const indexA = gradeOrder.indexOf(gradeA);
    const indexB = gradeOrder.indexOf(gradeB);
    if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Submit grades
  const handleSubmit = async () => {
    if (!selSubject) return toast.error('Please select a subject');
    if (selectedSubjectData?.has_components && !selComponent) return toast.error('Please select a component (Music & Arts or PE & Health)');
    const toSubmit = students.filter(s => cells[s.student] !== '');
    if (!toSubmit.length) return toast.error('Enter at least one grade');

    // Validate grades
    for (const s of toSubmit) {
      const val = parseFloat(cells[s.student]);
      if (isNaN(val) || val < 0 || val > 100) {
        return toast.error(`${formatName(s.student_name)}: grade must be between 0 and 100`);
      }
    }

    // Check if grading period is open for this term (teachers only)
    if (user?.role === 'staff') {
      try {
        const gpRes = await api.get('/grading-periods/', { params: { quarter: selQuarter } });
        const periods = Array.isArray(gpRes.data) ? gpRes.data : (gpRes.data?.results || []);
        const openPeriod = periods.find(p => ['open', 'closing_soon'].includes(p.status));
        if (!openPeriod) {
          return toast.error(`Term ${selQuarter} is not open. Contact your admin to open it.`);
        }
      } catch {}
    }

    // Check for overwrites
    const overwriting = toSubmit.filter(s => {
      const existing = existingGrades[s.student];
      return existing && parseFloat(cells[s.student]) !== parseFloat(existing.raw_score);
    });

    let confirmTitle = 'Submit Final Grades?';
    let confirmHtml = `Submit final grades for <strong>${toSubmit.length}</strong> student(s) for ${periodLabel} ${selQuarter}?`;
    let confirmIcon = 'question';

    if (overwriting.length > 0) {
      confirmTitle = 'Overwrite Existing Grades?';
      confirmIcon = 'warning';
      confirmHtml = `
        <div class="text-left space-y-2">
          <p class="font-bold text-amber-600 mb-2">You are about to overwrite grades for ${overwriting.length} student${overwriting.length === 1 ? '' : 's'} in ${periodLabel} ${selQuarter}:</p>
          <div class="max-h-32 overflow-y-auto border border-amber-200 rounded-lg p-3 bg-amber-50 text-xs">
            ${overwriting.map(s => {
              const ex = existingGrades[s.student];
              return `<div class="py-1 border-b border-amber-100 last:border-0">
                <strong>${formatName(s.student_name)}</strong>: ${ex.raw_score} → <span class="text-violet-700 font-bold">${cells[s.student]}</span>
              </div>`;
            }).join('')}
          </div>
          <p class="text-xs text-slate-600 mt-2">Total to submit: ${toSubmit.length} student${toSubmit.length === 1 ? '' : 's'}.</p>
        </div>
      `;
    }

    const result = await Swal.fire({
      title: confirmTitle,
      html: confirmHtml,
      icon: confirmIcon,
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Submit',
    });
    if (!result.isConfirmed) return;

    const cs = subjects.find(s => String(s.subject) === String(selSubject));
    if (!cs) return toast.error('Subject assignment not found');

    setSubmitting(true);
    const errors = [];

    await Promise.all(toSubmit.map(async s => {
      const finalScore = parseFloat(cells[s.student]);
      const existing = existingGrades[s.student];
      const payload = {
        student: s.student,
        subject: selSubject,
        classroom: selClassroom,
        teacher: cs.teacher,
        grade_type: 'final_grade',
        component: selComponent || '',
        quarter: selQuarter,
        academic_year: academicYear,
        raw_score: finalScore,
        total_score: 100,
      };
      try {
        if (existing?.id) {
          await api.put(`/grades/${existing.id}/`, payload);
        } else {
          await api.post('/grades/', payload);
        }
      } catch (err) {
        let msg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Error';
        if (msg.toLowerCase().includes('unique set')) {
          msg = 'Grade already submitted for this period';
        }
        errors.push(`${formatName(s.student_name)}: ${msg}`);
      }
    }));

    setSubmitting(false);

    if (!errors.length) {
      playSound('gradeSubmit');
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-bold">Final grades submitted successfully</span>
          <button
            onClick={() => navigate('/teacher-grade-dashboard')}
            className="text-xs text-violet-600 font-bold text-left hover:underline"
          >
            View submission status →
          </button>
        </div>
      );
      setCells({});
      fetchExistingGrades();
    } else {
      playSound('error');
      const allDuplicates = errors.every(e => e.toLowerCase().includes('already submitted'));
      Swal.fire({
        icon: errors.length < toSubmit.length ? 'warning' : 'error',
        title: allDuplicates ? 'Grades Already Submitted' : (errors.length < toSubmit.length ? 'Partial Success' : 'Submission Failed'),
        html: `
          <div class="text-sm text-slate-600 mb-2">
            ${allDuplicates ? `All selected students already have grades recorded for this ${periodLabel.toLowerCase()}.` : 'Issues submitting some grades:'}
          </div>
          <div class="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
            ${errors.map(e => `<div class="text-xs text-left py-1 border-b border-slate-100 last:border-0">${e}</div>`).join('')}
          </div>
        `,
        confirmButtonColor: '#2563eb',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 h-screen overflow-hidden"
    >
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PAGE HEADER */}
      {/* ══════════════════════════════════════════════════════════════ */}
      
      <div className="flex-shrink-0 px-4 sm:px-5 md:px-6 py-4 sm:py-5 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Title Section */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Grade Entry</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Final Grade Input
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-semibold">
              Enter final grades for students (Scale: 0-100)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isEmbedded && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/grade-management')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!selSubject || (selectedSubjectData?.has_components && !selComponent) || !students.length || filled.length === 0}
              loading={submitting}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit Grades
            </Button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CONTROLS PANEL */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <div className="flex-shrink-0 px-4 sm:px-5 md:px-6 py-3 sm:py-4 bg-white border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {/* Classroom - Hide selector in embedded mode */}
          {!isEmbedded && (
            <div className="md:col-span-1">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Classroom
              </label>
              <select
                value={selClassroom}
                onChange={e => {
                  setSelClassroom(e.target.value);
                  setSelSubject('');
                  setSelComponent('');
                }}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 text-sm font-semibold shadow-sm transition-all"
              >
                <option value="">Select classroom</option>
                {sortedClassrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div className={isEmbedded ? "md:col-span-3" : "md:col-span-2"}>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Subject
            </label>
            <select
              value={selSubject}
              onChange={e => setSelSubject(e.target.value)}
              disabled={!selClassroom}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 text-sm font-semibold shadow-sm transition-all disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.subject}>{s.subject_name}</option>
              ))}
            </select>
          </div>

          {/* MAPEH Component Tabs */}
          {selectedSubjectData?.has_components && (
            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Component
              </label>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                {[
                  { value: 'music_arts', label: 'Music & Arts' },
                  { value: 'pe_health', label: 'PE & Health' },
                ].map(comp => (
                  <button
                    key={comp.value}
                    onClick={() => setSelComponent(comp.value)}
                    className={`flex-1 px-3 py-3 text-xs font-extrabold uppercase tracking-wide transition-all ${
                      selComponent === comp.value
                        ? 'bg-violet-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {comp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grading Period */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              {periodLabel}
            </label>
            {/* Mobile: dropdown; sm+: segmented button group */}
            <select
              value={selQuarter}
              onChange={e => setSelQuarter(Number(e.target.value))}
              className="sm:hidden w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 text-sm font-semibold shadow-sm"
            >
              {allPeriodValues.map(q => {
                const isActive = periodValues.includes(q);
                return (
                  <option key={q} value={q} disabled={!isActive}>
                    {periodLabel} {q}{!isActive ? ' (Locked)' : ''}
                  </option>
                );
              })}
            </select>
            <div className="hidden sm:flex rounded-lg border border-slate-300 overflow-hidden shadow-sm">
              {allPeriodValues.map(q => {
                const isActive = periodValues.includes(q);
                return (
                  <button
                    key={q}
                    onClick={() => isActive && setSelQuarter(q)}
                    disabled={!isActive}
                    title={!isActive ? 'This period is not open' : ''}
                    className={`flex-1 px-3 py-3 text-xs font-extrabold uppercase tracking-wide transition-all ${
                      !isActive
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                        : selQuarter === q
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {periodShortLabels[q - 1]}
                    {!isActive && (
                      <svg className="inline w-3 h-3 ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Academic Year
            </label>
            <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => handleYearChange('prev')}
                className="px-3 py-2.5 hover:bg-slate-50 text-slate-600 border-r border-slate-300 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 text-center text-xs font-bold text-slate-700 select-none">
                {academicYear}
              </div>
              <button
                onClick={() => handleYearChange('next')}
                className="px-3 py-2.5 hover:bg-slate-50 text-slate-600 border-l border-slate-300 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Context Breadcrumb */}
        {selClassroom && selSubject && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-600">
            <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-bold text-violet-700">
              {classrooms.find(c => String(c.id) === String(selClassroom))?.name}
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-700">
              {subjects.find(s => String(s.subject) === String(selSubject))?.subject_name}
            </span>
            {selComponent && (
              <>
                <span className="text-slate-400">/</span>
                <Badge variant="violet" size="sm">
                  {selComponent === 'music_arts' ? 'Music & Arts' : 'PE & Health'}
                </Badge>
              </>
            )}
            <span className="text-slate-400">/</span>
            <Badge variant="blue" size="sm">{periodLabel} {selQuarter}</Badge>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* GRADING PERIOD BANNER */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {activePeriod !== undefined && (
        <div className={`flex-shrink-0 px-4 sm:px-5 md:px-6 py-2.5 border-b flex items-center justify-between gap-3 flex-wrap ${
          !activePeriod
            ? 'bg-slate-50 border-slate-200'
            : activePeriod.days_remaining < 0
            ? 'bg-red-50 border-red-200'
            : activePeriod.days_remaining <= 2
            ? 'bg-amber-50 border-amber-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          {!activePeriod ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold">No active grading period — grades can still be saved as drafts.</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                  activePeriod.days_remaining < 0
                    ? 'bg-red-100 text-red-700'
                    : activePeriod.days_remaining <= 2
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {activePeriod.days_remaining < 0 ? 'Overdue' : activePeriod.days_remaining <= 2 ? 'Closing Soon' : 'Open'}
                </span>
                <span className={`text-xs font-bold ${
                  activePeriod.days_remaining < 0 ? 'text-red-700' :
                  activePeriod.days_remaining <= 2 ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  Term {activePeriod.quarter} · {activePeriod.academic_year_name}
                </span>
                <span className="text-xs text-slate-500">
                  Deadline: <strong>{activePeriod.effective_deadline ?? activePeriod.submission_deadline}</strong>
                  {activePeriod.days_remaining >= 0 && (
                    <span className={`ml-1.5 font-bold ${
                      activePeriod.days_remaining <= 2 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {activePeriod.days_remaining === 0
                        ? '(Due today!)'
                        : `(${activePeriod.days_remaining} day${activePeriod.days_remaining !== 1 ? 's' : ''} left)`}
                    </span>
                  )}
                  {activePeriod.days_remaining < 0 && (
                    <span className="ml-1.5 font-bold text-red-600">
                      ({Math.abs(activePeriod.days_remaining)} day{Math.abs(activePeriod.days_remaining) !== 1 ? 's' : ''} overdue)
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={() => navigate('/teacher-grade-dashboard')}
                className={`text-[11px] font-bold flex-shrink-0 hover:underline ${
                  activePeriod.days_remaining < 0 ? 'text-red-600' :
                  activePeriod.days_remaining <= 2 ? 'text-amber-600' : 'text-emerald-700'
                }`}
              >
                View Submission Status →
              </button>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STATISTICS PANEL */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {selClassroom && selSubject && students.length > 0 && scores.length > 0 && (
        <div className="flex-shrink-0 px-4 sm:px-5 md:px-6 py-3 sm:py-4 bg-violet-50 border-b border-violet-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-extrabold text-violet-600">
                {filled.length}/{students.length}
              </div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-0.5">
                Encoded
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-extrabold text-violet-600">
                {avg}
              </div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-0.5">
                Average
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-extrabold text-emerald-600">
                {highest}
              </div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-0.5">
                Highest
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-extrabold text-red-600">
                {lowest}
              </div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-0.5">
                Lowest
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-extrabold text-violet-600">
                {passing}/{scores.length}
              </div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-0.5">
                Passing
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* GRADE TABLE */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <div className="flex-1 overflow-auto min-h-0">
        {loading ? (
          /* Skeleton table — mirrors real row structure: # | name+avatar | grade input | performance */
          <div className="p-4 sm:p-5 md:p-6" aria-busy="true" aria-label="Loading students…">
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[2.5rem_1fr_8rem_11rem] gap-0 bg-slate-50 border-b-2 border-slate-200 px-4 py-3">
                <Skeleton className="h-2.5 w-4 rounded" />
                <Skeleton className="h-2.5 w-24 rounded" />
                <Skeleton className="h-2.5 w-16 rounded justify-self-center" />
                <Skeleton className="h-2.5 w-24 rounded justify-self-center" />
              </div>
              {/* Mobile header */}
              <div className="sm:hidden bg-slate-50 border-b-2 border-slate-200 px-3 py-2 flex items-center justify-between">
                <Skeleton className="h-2.5 w-20 rounded" />
                <Skeleton className="h-2.5 w-16 rounded" />
              </div>
              {/* 8 placeholder rows */}
              {[...Array(8)].map((_, i) => (
                <div key={i}>
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[2.5rem_1fr_8rem_11rem] items-center gap-0 px-4 py-3 border-b border-slate-100 last:border-0">
                    <Skeleton className="h-3 w-4 rounded" />
                    <div className="flex items-center gap-3">
                      <Skeleton.Avatar size="sm" square />
                      <div className="space-y-1.5 min-w-0">
                        <Skeleton className="h-3.5 rounded" style={{ width: `${110 + (i % 3) * 20}px` }} />
                        <Skeleton className="h-2.5 w-16 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-20 rounded-md justify-self-center" />
                    <Skeleton className="h-6 w-24 rounded-full justify-self-center" />
                  </div>
                  {/* Mobile row */}
                  <div className="sm:hidden px-3 py-3 border-b border-slate-100 last:border-0 flex items-center gap-3">
                    <Skeleton.Avatar size="sm" square />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Skeleton className="h-3.5 rounded" style={{ width: `${100 + (i % 3) * 15}px` }} />
                      <Skeleton className="h-2.5 w-14 rounded" />
                    </div>
                    <Skeleton className="h-8 w-14 rounded-md shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !selClassroom ? (
          <div className="flex items-center justify-center h-full p-8">
            <EmptyState
              title="Select a Classroom"
              description="Choose a classroom to start entering grades"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 3h18v18H3z" />
                </svg>
              }
            />
          </div>
        ) : !selSubject ? (
          <div className="flex items-center justify-center h-full p-8">
            <EmptyState
              title="Select a Subject"
              description="Choose a subject to start entering grades"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
            />
          </div>
        ) : students.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <EmptyState
              title="No Students Enrolled"
              description="This classroom doesn't have any students yet"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
          </div>
        ) : (
          <div className="p-4 sm:p-5 md:p-6">
            <Card>
              <CardHeader divider>
                <CardTitle subtitle={`Enter final grades for ${students.length} students`}>
                  Grade Sheet
                </CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider min-w-[200px]">
                          Student Name
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider w-32">
                          Final Grade
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider w-48">
                          Performance Level
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {(() => {
                        let lastSex = null;
                        let maleIdx = 0;
                        let femaleIdx = 0;

                        return students.map((s, idx) => {
                          const currentSex = (s.student_sex || 'other').toLowerCase();
                          const showHeader = currentSex !== lastSex;
                          lastSex = currentSex;

                          if (currentSex === 'male') maleIdx++;
                          if (currentSex === 'female') femaleIdx++;
                          const displayIdx = currentSex === 'male' ? maleIdx : currentSex === 'female' ? femaleIdx : idx + 1;

                          const raw = cells[s.student];
                          const score = raw !== '' && !isNaN(parseFloat(raw)) ? parseFloat(raw) : null;
                          const isOver = score !== null && score > 100;
                          const isActive = active === s.student;
                          const performance = getPerformanceLevel(score);
                          const existingGrade = existingGrades[s.student];
                          const willOverwrite = existingGrade && raw !== '' && score !== null && !isOver;

                          return (
                            <Fragment key={s.student}>
                              {showHeader && (
                                <tr className="bg-slate-100 border-y border-slate-200">
                                  <td colSpan="4" className="px-4 py-2 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${
                                        currentSex === 'male' ? 'bg-violet-500' :
                                        currentSex === 'female' ? 'bg-rose-500' :
                                        'bg-slate-400'
                                      }`} />
                                      {currentSex === 'male' ? 'Male Students' :
                                       currentSex === 'female' ? 'Female Students' :
                                       'Other / Unassigned'}
                                    </div>
                                  </td>
                                </tr>
                              )}
                              <tr
                                onClick={() => setActive(s.student)}
                                className={`cursor-pointer transition-colors ${
                                  isActive ? 'bg-violet-50 ring-2 ring-violet-500 ring-inset' :
                                  willOverwrite ? 'bg-amber-50 hover:bg-amber-100' :
                                  'hover:bg-slate-50'
                                }`}
                              >
                                <td className="px-4 py-3 text-xs font-bold text-slate-500">
                                  {displayIdx}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-md flex items-center justify-center text-white font-extrabold text-xs shadow-sm shrink-0 ${
                                      currentSex === 'male' ? 'bg-violet-500 border border-violet-700' :
                                      currentSex === 'female' ? 'bg-rose-500 border border-rose-700' :
                                      'bg-slate-500 border border-slate-700'
                                    }`}>
                                      {s.student_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-slate-900 truncate">
                                        {formatName(s.student_name)}
                                      </p>
                                      {existingGrade && raw === '' && (
                                        <Badge variant="slate" size="sm" className="mt-1">
                                          Current: {existingGrade.raw_score}
                                        </Badge>
                                      )}
                                      {willOverwrite && (
                                        <Badge variant="amber" size="sm" className="mt-1">
                                          Overwrites: {existingGrade.raw_score}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    ref={el => inputRefs.current[s.student] = el}
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={raw}
                                    onChange={e => handleGradeChange(s.student, e.target.value)}
                                    onFocus={() => setActive(s.student)}
                                    onKeyDown={e => handleKeyDown(e, s.student)}
                                    placeholder="0-100"
                                    className={`w-full px-3 py-2 text-center font-mono text-sm font-bold border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                                      isOver ? 'border-red-500 bg-red-50 text-red-700' :
                                      isActive ? 'border-violet-500 bg-white' :
                                      'border-slate-200 bg-white'
                                    }`}
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {isOver ? (
                                    <Badge variant="red">
                                      INVALID (Over 100)
                                    </Badge>
                                  ) : score !== null && performance ? (
                                    <Badge variant={performance.color}>
                                      <span className="hidden md:inline">{performance.label}</span>
                                      <span className="md:hidden">{performance.shortLabel}</span>
                                    </Badge>
                                  ) : existingGrade ? (
                                    <Badge variant={getPerformanceLevel(parseFloat(existingGrade.raw_score))?.color || 'slate'} className="opacity-50">
                                      <span className="hidden md:inline">{getPerformanceLevel(parseFloat(existingGrade.raw_score))?.label}</span>
                                      <span className="md:hidden">{getPerformanceLevel(parseFloat(existingGrade.raw_score))?.shortLabel}</span>
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-300 text-xs font-bold">—</span>
                                  )}
                                </td>
                              </tr>
                            </Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            {/* Keyboard Navigation Hint */}
            <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-violet-50 border border-violet-200 rounded-md">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Keyboard Navigation: Use Tab, Enter, or Arrow keys to move between fields
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GradeInput;
