import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useParallelFetch } from '../hooks/useFetch';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSystemSettings } from '../hooks/useSystemSettings';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  EmptyState,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalBtnSecondary,
} from '../components/ui';
import { getPerformanceLevel } from '../utils/grading';

/**
 * Grade Management - DepEd Academic Style
 * Card-based dashboard for viewing and managing student grades
 */

const ScoreBadge = ({ score, size = 'md' }) => {
  if (score == null || isNaN(score)) {
    return <span className="text-slate-300 text-xs font-bold">—</span>;
  }
  const level = getPerformanceLevel(parseFloat(score));
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <Badge variant={level?.color || 'slate'} className={sizeClass}>
      {parseFloat(score).toFixed(0)}
    </Badge>
  );
};

const GradeManagement = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { settings, periodValues, periodShortLabels, periodLabel, periodOptions } =
    useSystemSettings();

  // State
  const [filterYear, setFilterYear] = useState(settings?.academic_year || '');
  const [filterQuarter, setFilterQuarter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);

  const { data, loading, refetch } = useParallelFetch(
    {
      grades: `/grades/?academic_year=${filterYear}`,
      classrooms: `/classrooms/?academic_year=${filterYear}`,
    },
    { deps: [filterYear] }
  );

  const grades = useMemo(() => {
    const all = data.grades || [];
    return all.filter((g) => g.grade_type === 'final_grade');
  }, [data.grades]);

  // Sync academic year with admin settings when settings load
  useEffect(() => {
    if (settings?.academic_year) setFilterYear(settings.academic_year);
  }, [settings?.academic_year]);

  // Academic year navigation
  const handleYearChange = (dir) => {
    const [start, end] = filterYear.split('-').map(Number);
    const newYear = dir === 'next' ? `${start + 1}-${end + 1}` : `${start - 1}-${end - 1}`;
    setFilterYear(newYear);
  };

  const refresh = async () => {
    try {
      await refetch();
      toast.success('Data refreshed');
    } catch {
      toast.error('Failed to refresh');
    }
  };

  const handleDeleteGrade = async (gradeId, studentName, quarter) => {
    const confirmed = window.confirm(`Delete grade for ${studentName} in Term ${quarter}?`);
    if (!confirmed) return;
    try {
      await api.delete(`/grades/${gradeId}/`);
      toast.success('Grade deleted');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete grade');
    }
  };

  // Format student name
  const formatName = (fullName = '') => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return fullName.toUpperCase();
    const last = parts.pop();
    return `${last.toUpperCase()}, ${parts.join(' ').toUpperCase()}`;
  };

  // Calculate final grade from quarters
  const calculateFinal = (quarters) => {
    const scores = Object.values(quarters)
      .map((g) => parseFloat(g.raw_score))
      .filter((s) => !isNaN(s));
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  };

  // Filtered grades
  const filteredGrades = useMemo(() => {
    return grades.filter((g) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        g.student_name?.toLowerCase().includes(q) ||
        g.subject_name?.toLowerCase().includes(q) ||
        g.classroom_name?.toLowerCase().includes(q);
      const matchQ = !filterQuarter || String(g.quarter) === filterQuarter;
      return matchSearch && matchQ;
    });
  }, [grades, search, filterQuarter]);

  // Build classroom summaries with grade statistics
  const classroomSummaries = useMemo(() => {
    const summaries = {};

    filteredGrades.forEach((g) => {
      if (!summaries[g.classroom]) {
        summaries[g.classroom] = {
          id: g.classroom,
          name: g.classroom_name,
          subjects: {},
          totalStudents: new Set(),
          totalGrades: 0,
          gradeSum: 0,
        };
      }

      const classroom = summaries[g.classroom];
      classroom.totalStudents.add(g.student);
      classroom.totalGrades++;
      classroom.gradeSum += parseFloat(g.raw_score) || 0;

      // Group by subject
      if (!classroom.subjects[g.subject]) {
        classroom.subjects[g.subject] = {
          id: g.subject,
          name: g.subject_name,
          code: g.subject_code,
          students: {},
        };
      }

      const subject = classroom.subjects[g.subject];
      if (!subject.students[g.student]) {
        subject.students[g.student] = {
          id: g.student,
          name: g.student_name,
          email: g.student_email,
          sex: g.student_sex,
          quarters: {},
        };
      }

      subject.students[g.student].quarters[g.quarter] = g;
    });

    // Convert sets to counts and calculate averages
    Object.values(summaries).forEach((c) => {
      c.studentCount = c.totalStudents.size;
      c.avgGrade = c.totalGrades > 0 ? (c.gradeSum / c.totalGrades).toFixed(2) : null;
      c.subjectCount = Object.keys(c.subjects).length;
    });

    return Object.values(summaries);
  }, [filteredGrades]);

  // Sort classrooms by grade level
  const sortedClassrooms = useMemo(() => {
    return classroomSummaries.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });
  }, [classroomSummaries]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-3 sm:px-4 py-4 sm:py-5 md:px-6 md:py-6 space-y-4 sm:space-y-5 md:space-y-6"
    >
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PAGE HEADER */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Grade Overview</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Grade Management
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-semibold">
            View and manage student grades by classroom and subject
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </Button>
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <Button variant="primary" onClick={() => navigate('/attendance')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Input Grades
            </Button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* FILTERS */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <Card>
        <CardBody className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search student, subject, or classroom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all"
              />
            </div>

            {/* Grading Period Filter */}
            <div>
              <select
                value={filterQuarter}
                onChange={(e) => setFilterQuarter(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all"
              >
                <option value="">All {periodLabel}s</option>
                {periodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => handleYearChange('prev')}
                  className="px-3 py-2.5 hover:bg-slate-50 text-slate-600 border-r border-slate-300 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div className="flex-1 text-center text-xs font-bold text-slate-700 select-none">
                  {filterYear}
                </div>
                <button
                  onClick={() => handleYearChange('next')}
                  className="px-3 py-2.5 hover:bg-slate-50 text-slate-600 border-l border-slate-300 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CLASSROOM CARDS GRID */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {loading ? (
        /* Skeleton grid — matches 3-col card layout */
        <>
          {/* Summary stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton.StatCard key={i} />)}
          </div>

          {/* Classroom cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5" aria-busy="true" aria-label="Loading grade records…">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                {/* Card header */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                  <Skeleton className="w-12 h-12 rounded-md shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                  <Skeleton className="w-5 h-5 rounded" />
                </div>
                {/* Stats row */}
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="text-center space-y-1">
                        <Skeleton className="h-6 w-8 rounded mx-auto" />
                        <Skeleton className="h-2.5 w-12 rounded mx-auto" />
                      </div>
                    ))}
                  </div>
                  {/* Subject pills */}
                  <div className="space-y-2">
                    <Skeleton className="h-2.5 w-14 rounded" />
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map(j => (
                        <Skeleton key={j} className="h-5 w-12 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : sortedClassrooms.length === 0 ? (
        <Card>
          <CardBody className="p-12">
            <EmptyState
              title="No Grade Records Found"
              description={
                search || filterQuarter
                  ? 'Try adjusting your filters'
                  : 'Grades will appear here once they are entered'
              }
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-l-4 border-l-violet-500">
              <CardBody className="p-4 text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-violet-600">
                  {sortedClassrooms.length}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">
                  Classrooms
                </div>
              </CardBody>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardBody className="p-4 text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-emerald-600">
                  {sortedClassrooms.reduce((sum, c) => sum + c.studentCount, 0)}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">
                  Students
                </div>
              </CardBody>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardBody className="p-4 text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-amber-600">
                  {sortedClassrooms.reduce((sum, c) => sum + c.subjectCount, 0)}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">
                  Subjects
                </div>
              </CardBody>
            </Card>

            <Card className="border-l-4 border-l-violet-500">
              <CardBody className="p-4 text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-violet-600">
                  {filteredGrades.length}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">
                  Grade Entries
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Classroom Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {sortedClassrooms.map((classroom, index) => (
              <motion.div
                key={classroom.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card
                  interactive
                  onClick={() => setSelectedClass(classroom)}
                  className="border-l-4 border-l-violet-500 hover:shadow-lg transition-all"
                >
                  <CardHeader divider>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-md bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm border border-violet-700">
                          {classroom.name?.match(/\d+/)?.[0] || classroom.name?.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{classroom.name}</CardTitle>
                          <p className="text-xs font-semibold text-slate-600 mt-0.5">
                            {classroom.studentCount} Students
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </CardHeader>

                  <CardBody>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-extrabold text-violet-600">
                          {classroom.subjectCount}
                        </div>
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                          Subjects
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-extrabold text-emerald-600">
                          {classroom.totalGrades}
                        </div>
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                          Grades
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-extrabold text-amber-600">
                          {classroom.avgGrade || '—'}
                        </div>
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                          Average
                        </div>
                      </div>
                    </div>

                    {/* Subject Pills */}
                    <div>
                      <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                        Subjects
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.values(classroom.subjects)
                          .slice(0, 4)
                          .map((subject) => (
                            <Badge key={subject.id} variant="blue" size="sm">
                              {subject.code}
                            </Badge>
                          ))}
                        {Object.keys(classroom.subjects).length > 4 && (
                          <Badge variant="slate" size="sm">
                            +{Object.keys(classroom.subjects).length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CLASSROOM DETAIL MODAL */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <AnimatePresence>
        {selectedClass && (
          <ClassroomDetailModal
            classroom={selectedClass}
            onClose={() => setSelectedClass(null)}
            user={user}
            formatName={formatName}
            calculateFinal={calculateFinal}
            periodValues={periodValues}
            periodShortLabels={periodShortLabels}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// CLASSROOM DETAIL MODAL COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const ClassroomDetailModal = ({
  classroom,
  onClose,
  user,
  formatName,
  calculateFinal,
  periodValues,
  periodShortLabels,
}) => {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const subjects = Object.values(classroom.subjects);

  return (
    <Modal isOpen={true} onClose={onClose} size="xl">
      <ModalHeader onClose={onClose}>
        <ModalTitle
          title={classroom.name}
          subtitle={`Grade Records — ${classroom.studentCount} Students`}
        />
      </ModalHeader>

      <ModalBody>
        {/* Subject Tabs */}
        <div className="mb-4 flex gap-2 flex-wrap">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() =>
                setSelectedSubject(selectedSubject?.id === subject.id ? null : subject)
              }
              className={`px-4 py-2 rounded-md text-xs font-extrabold uppercase tracking-wide transition-all ${
                selectedSubject?.id === subject.id
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {subject.code}
            </button>
          ))}
        </div>

        {/* Subject Details */}
        {selectedSubject ? (
          <SubjectGradeTable
            subject={selectedSubject}
            user={user}
            formatName={formatName}
            calculateFinal={calculateFinal}
            periodValues={periodValues}
            periodShortLabels={periodShortLabels}
            onDeleteGrade={handleDeleteGrade}
          />
        ) : (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 mx-auto text-slate-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
              Select a subject to view grades
            </p>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <ModalBtnSecondary onClick={onClose}>Close</ModalBtnSecondary>
      </ModalFooter>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SUBJECT GRADE TABLE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const SubjectGradeTable = ({
  subject,
  user,
  formatName,
  calculateFinal,
  periodValues,
  periodShortLabels,
  onDeleteGrade,
}) => {
  const navigate = useNavigate();

  // Check if this subject has components (MAPEH)
  const hasComponents = useMemo(() => {
    for (const student of Object.values(subject.students)) {
      for (const grade of Object.values(student.quarters)) {
        if (grade?.has_components) return true;
      }
    }
    return false;
  }, [subject.students]);

  // Sort students: Male first, then Female, then by name
  const sortedStudents = useMemo(() => {
    return Object.values(subject.students).sort((a, b) => {
      const sexOrder = { male: 1, female: 2, other: 3 };
      const sexA = sexOrder[a.sex?.toLowerCase()] || 4;
      const sexB = sexOrder[b.sex?.toLowerCase()] || 4;

      if (sexA !== sexB) return sexA - sexB;

      const nameA = formatName(a.name).toLowerCase();
      const nameB = formatName(b.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [subject.students, formatName]);

  let maleIdx = 0;
  let femaleIdx = 0;

  return (
    <div>
      <div className="mb-3 p-3 bg-violet-50 border border-violet-200 rounded-md">
        <h3 className="text-sm font-extrabold text-violet-900 uppercase tracking-wide">
          {subject.name}
        </h3>
        <p className="text-xs font-semibold text-violet-700 mt-0.5">
          {subject.code} • {sortedStudents.length} Students
          {hasComponents && <span className="ml-2 text-violet-500">(Music & Arts / PE & Health)</span>}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider min-w-[180px]">
                Student Name
              </th>
              {hasComponents ? (
                <>
                  {periodShortLabels.map((label) => (
                    <th key={`ma-${label}`} className="px-2 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider bg-rose-50">
                      {label}<br/><span className="text-[9px] font-bold text-rose-500">MA</span>
                    </th>
                  ))}
                  {periodShortLabels.map((label) => (
                    <th key={`peh-${label}`} className="px-2 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider bg-blue-50">
                      {label}<br/><span className="text-[9px] font-bold text-blue-500">PEH</span>
                    </th>
                  ))}
                </>
              ) : (
                periodShortLabels.map((label) => (
                  <th key={label} className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    {label}
                  </th>
                ))
              )}
              <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider bg-violet-50">
                Final
              </th>
              <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Remarks
              </th>
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {sortedStudents.map((student, idx) => {
              const currentSex = (student.sex || 'other').toLowerCase();

              if (currentSex === 'male') maleIdx++;
              if (currentSex === 'female') femaleIdx++;
              const displayIdx =
                currentSex === 'male' ? maleIdx : currentSex === 'female' ? femaleIdx : idx + 1;

              // For subjects with components, calculate combined final from component grades
              let final = null;
              let rounded = null;
              if (hasComponents) {
                // Collect component final grades across all quarters
                const componentScores = [];
                for (const q of periodValues) {
                  const grade = student.quarters[q];
                  if (grade?.component && grade.raw_score != null) {
                    componentScores.push(parseFloat(grade.raw_score));
                  }
                }
                // Average the component finals for the combined MAPEH grade
                if (componentScores.length > 0) {
                  final = (componentScores.reduce((a, b) => a + b, 0) / componentScores.length).toFixed(2);
                  rounded = Math.round(parseFloat(final));
                }
              } else {
                final = calculateFinal(student.quarters);
                rounded = final != null ? Math.round(parseFloat(final)) : null;
              }
              const performance = getPerformanceLevel(rounded);

              return (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-slate-500">{displayIdx}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-md flex items-center justify-center text-white font-extrabold text-xs shadow-sm shrink-0 ${
                          currentSex === 'male'
                            ? 'bg-violet-500 border border-violet-700'
                            : currentSex === 'female'
                              ? 'bg-rose-500 border border-rose-700'
                              : 'bg-slate-500 border border-slate-700'
                        }`}
                      >
                        {student.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {formatName(student.name)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{student.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Grading Period Grades */}
                  {hasComponents ? (
                    <>
                      {periodValues.map((quarter) => {
                        const grade = student.quarters[quarter];
                        const maScore = grade?.component === 'music_arts' ? grade.raw_score : null;
                        const maGrade = grade?.component === 'music_arts' ? grade : null;
                        return (
                          <td key={`ma-${quarter}`} className="px-2 py-3 text-center bg-rose-50/30">
                            <div className="flex flex-col items-center gap-1">
                              <ScoreBadge score={maScore} size="sm" />
                              {user?.role === 'admin' && maGrade?.id && (
                                <button
                                  onClick={() => onDeleteGrade(maGrade.id, student.name, quarter)}
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                  title={`Delete Term ${quarter} MA grade`}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      {periodValues.map((quarter) => {
                        const grade = student.quarters[quarter];
                        const pehScore = grade?.component === 'pe_health' ? grade.raw_score : null;
                        const pehGrade = grade?.component === 'pe_health' ? grade : null;
                        return (
                          <td key={`peh-${quarter}`} className="px-2 py-3 text-center bg-blue-50/30">
                            <div className="flex flex-col items-center gap-1">
                              <ScoreBadge score={pehScore} size="sm" />
                              {user?.role === 'admin' && pehGrade?.id && (
                                <button
                                  onClick={() => onDeleteGrade(pehGrade.id, student.name, quarter)}
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                  title={`Delete Term ${quarter} PEH grade`}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </>
                  ) : (
                    periodValues.map((quarter) => {
                      const grade = student.quarters[quarter];
                      return (
                        <td key={quarter} className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <ScoreBadge score={grade?.raw_score} size="sm" />
                            {grade?.is_locked && (
                              <span className="text-xs" title="Locked">
                                🔒
                              </span>
                            )}
                            {user?.role === 'admin' && grade?.id && (
                              <button
                                onClick={() => onDeleteGrade(grade.id, student.name, quarter)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                                title={`Delete Term ${quarter} grade`}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })
                  )}

                  {/* Final Grade */}
                  <td className="px-4 py-3 text-center bg-violet-50">
                    <ScoreBadge score={rounded} />
                  </td>

                  {/* Remarks */}
                  <td className="px-4 py-3 text-center">
                    {performance ? (
                      <Badge variant={performance.color} size="sm">
                        {performance.shortLabel}
                      </Badge>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/profile?student_id=${student.id}`)}
                          className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-md transition-all"
                          title="View Profile"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => navigate(`/grade-input`)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                          title="View Full Grades"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GradeManagement;
