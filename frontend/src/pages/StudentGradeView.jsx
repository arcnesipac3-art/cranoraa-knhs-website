import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import { useAuth } from '../context/AuthContext';
import { useSystemSettings } from '../hooks/useSystemSettings';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button, Badge,
  Skeleton, EmptyState
} from '../components/ui';
import { PERFORMANCE_LEVELS, getPerformanceLevel } from '../utils/grading';

/**
 * Student Grade View - DepEd Official Report Card Style
 * Professional grade report for students and parents
 */

const ScoreBadge = ({ score, size = 'md' }) => {
  if (score == null || isNaN(score)) {
    return <span className="text-slate-300 text-sm font-bold">—</span>;
  }
  const level = getPerformanceLevel(parseFloat(score));
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  
  return (
    <Badge variant={level?.color || 'slate'} className={sizeClass}>
      {parseFloat(score).toFixed(0)}
    </Badge>
  );
};

const StudentGradeView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get('student_id');
  const isViewingOther = !!studentIdParam;
  const { periodValues, periodShortLabels, periodLabel, periodOptions, isSHS } = useSystemSettings();

  // State
  const [grades, setGrades] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterQuarter, setFilterQuarter] = useState('');
  const { academicYear: filterYear, setAcademicYear: setFilterYear } = useActiveAcademicYear();
  const [filterSubject, setFilterSubject] = useState('');

  // Academic year navigation
  const handleYearChange = (dir) => {
    const [start, end] = filterYear.split('-').map(Number);
    const newYear = dir === 'next' ? `${start + 1}-${end + 1}` : `${start - 1}-${end - 1}`;
    setFilterYear(newYear);
  };

  // Load grades
  useEffect(() => {
    if (studentIdParam) {
      Promise.all([
        api.get(`/grades/?student=${studentIdParam}&academic_year=${filterYear}`),
        api.get(`/users/${studentIdParam}/`),
      ])
        .then(([gRes, uRes]) => {
          setGrades(gRes.data.filter(g => g.grade_type === 'final_grade'));
          setViewingUser(uRes.data);
        })
        .catch(() => toast.error('Failed to load student grades'))
        .finally(() => setLoading(false));
    } else {
      api.get(`/grades/my_grades/?academic_year=${filterYear}`)
        .then(r => setGrades(r.data.filter(g => g.grade_type === 'final_grade')))
        .catch(() => toast.error('Failed to load grades'))
        .finally(() => setLoading(false));
    }
  }, [studentIdParam, filterYear]);

  // Filter grades
  const filtered = grades.filter(g => {
    const matchQ = !filterQuarter || String(g.quarter) === filterQuarter;
    const matchS = !filterSubject || String(g.subject) === filterSubject;
    return matchQ && matchS;
  });

  // Group by subject — handle MAPEH components
  const bySubject = filtered.reduce((acc, g) => {
    if (!acc[g.subject]) {
      acc[g.subject] = {
        subject_name: g.subject_name,
        subject_code: g.subject_code,
        has_components: g.has_components || false,
        quarters: {},
      };
    }

    const entry = acc[g.subject];

    if (g.component) {
      // Component grade (music_arts or pe_health)
      if (!entry.quarters[g.quarter]) {
        entry.quarters[g.quarter] = { components: {} };
      }
      entry.quarters[g.quarter].components[g.component] = g;
      // Compute combined score from components
      const comps = entry.quarters[g.quarter].components;
      const scores = Object.values(comps).map(c => parseFloat(c.raw_score)).filter(s => !isNaN(s));
      if (scores.length > 0) {
        entry.quarters[g.quarter].raw_score = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
        entry.quarters[g.quarter].has_components = true;
      }
    } else {
      // Normal grade
      entry.quarters[g.quarter] = g;
    }

    return acc;
  }, {});

  const uniqueSubjects = [
    ...new Map(
      grades.map(g => [g.subject, { id: g.subject, name: g.subject_name }])
    ).values(),
  ];

  // Calculate overall average
  const allScores = filtered
    .map(g => parseFloat(g.raw_score))
    .filter(v => !isNaN(v));
  const overallAvg = allScores.length
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
    : null;
  const overallRounded = overallAvg ? Math.round(parseFloat(overallAvg)) : null;
  const overallPerformance = getPerformanceLevel(overallRounded);

  const subjectEntries = Object.values(bySubject);

  const displayName = viewingUser
    ? viewingUser.first_name && viewingUser.last_name
      ? `${viewingUser.first_name} ${viewingUser.last_name}`
      : viewingUser.username
    : user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username;

  // PDF Export Handler
  const handlePDFDownload = async () => {
    if (!displayName) return toast.error('Student information not available');
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('KIWALAN NATIONAL HIGH SCHOOL', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Official Student Report Card', pageWidth / 2, 28, { align: 'center' });
    
    // Student Info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Student: ${displayName}`, 20, 45);
    doc.text(`Academic Year: ${filterYear}`, 20, 52);
    
    if (filterQuarter) {
      doc.text(`${periodLabel}: ${filterQuarter}`, 20, 59);
    }
    
    // Table headers
    let yPos = 70;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Subject', 20, yPos);
    // Dynamically distribute period columns between x=115 and x=190
    const periodCount = periodShortLabels.length; // 4 for JHS quarters, 3 for SHS terms
    const colStart = 115;
    const colEnd = 190;
    const colStep = periodCount > 1 ? (colEnd - colStart) / (periodCount - 1) : 0;
    const headerX = periodShortLabels.map((_, idx) =>
      periodCount === 1 ? (colStart + colEnd) / 2 : colStart + idx * colStep
    );
    periodShortLabels.forEach((label, idx) => {
      doc.text(label, headerX[idx], yPos, { align: 'center' });
    });
    doc.text('Final', 200, yPos, { align: 'right' });
    
    doc.line(20, yPos + 2, 200, yPos + 2);
    yPos += 8;
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    subjectEntries.forEach((entry) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      
      const periodScores = periodValues.map(q => entry.quarters[q]?.raw_score || '—');
      
      const scores = periodScores
        .map(s => parseFloat(s))
        .filter(s => !isNaN(s));
      const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(0) : '—';
      
      doc.text(entry.subject_name, 20, yPos);
      periodScores.forEach((score, idx) => {
        doc.text(String(score), headerX[idx], yPos, { align: 'center' });
      });
      doc.text(String(avg), 200, yPos, { align: 'right' });
      
      yPos += 7;
    });
    
    // General Average
    if (overallAvg) {
      yPos += 5;
      doc.line(20, yPos, 200, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('General Average:', 20, yPos);
      doc.text(String(overallRounded), 200, yPos, { align: 'right' });
      
      if (overallPerformance) {
        yPos += 7;
        doc.text('Performance Level:', 20, yPos);
        doc.text(overallPerformance.label, 200, yPos, { align: 'right' });
      }
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text('Kiwalan National High School - Official Digital Campus', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    doc.save(`${displayName.replace(/\s+/g, '_')}_Grades_${filterYear}.pdf`);
    toast.success('Report card downloaded');
  };

  return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="page-bottom-safe max-w-[1400px] mx-auto bg-slate-50 px-2 py-2 sm:px-3 sm:py-3 md:px-5 md:py-5 lg:px-6 lg:py-6 xl:px-8 xl:py-8 space-y-2 sm:space-y-4 md:space-y-5"
      >
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PAGE HEADER WITH SCHOOL IDENTITY */}
      {/* ══════════════════════════════════════════════════════════════ */}
      
      <Card className="border-b-4 border-b-violet-600">
        <CardBody className="p-2 sm:p-4 md:p-5 lg:p-6">
          <div className="text-center">
            {/* School Seal */}
            <div className="flex justify-center mb-1.5 sm:mb-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center text-white font-extrabold text-lg sm:text-xl md:text-2xl shadow-lg border-3 border-white ring-2 ring-violet-200">
                K
              </div>
            </div>

            {/* School Name */}
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
              Kiwalan National High School
            </h1>
            <p className="text-xs sm:text-xs md:text-sm font-bold text-violet-700 uppercase tracking-wider mt-0.5 sm:mt-1">
              Official Student Report Card
            </p>
            <p className="text-[10px] sm:text-xs md:text-xs font-semibold text-slate-600 mt-0.5 sm:mt-1">
              Excellence in Education, Service to Community
            </p>
          </div>
        </CardBody>
      </Card>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STUDENT INFORMATION */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <Card>
        <CardHeader divider className="p-2 sm:p-3 md:p-4">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-violet-700 uppercase tracking-wide">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Student Information</span>
          </div>
        </CardHeader>
        <CardBody className="p-2 sm:p-3 md:p-4">
          {loading ? (
            <Skeleton.CardGrid />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Student Name
                </label>
                <p className="text-sm font-bold text-slate-900">
                  {displayName || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  LRN / Student ID
                </label>
                <p className="text-sm font-bold text-slate-900">
                  {(viewingUser?.username || user?.username) || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Grade Level
                </label>
                <Badge variant="blue" size="md">
                  {(viewingUser?.profile?.grade_level || user?.profile?.grade_level) || 'N/A'}
                </Badge>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* FILTERS AND CONTROLS */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <Card>
        <CardBody className="p-2 sm:p-3 md:p-4 lg:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {/* Grading Period Filter */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                {periodLabel}
              </label>
              <select
                value={filterQuarter}
                onChange={e => setFilterQuarter(e.target.value)}
                className="w-full px-2.5 py-2 sm:px-3 sm:py-2.5 border border-slate-300 rounded-md bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all"
              >
                <option value="">All {periodLabel}s</option>
                {periodOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <select
                value={filterSubject}
                onChange={e => setFilterSubject(e.target.value)}
                className="w-full px-2.5 py-2 sm:px-3 sm:py-2.5 border border-slate-300 rounded-md bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all"
              >
                <option value="">All Subjects</option>
                {uniqueSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Academic Year
              </label>
              <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => handleYearChange('prev')}
                  className="px-2 py-2 sm:px-2.5 sm:py-2.5 hover:bg-slate-50 text-slate-600 border-r border-slate-300 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 text-center text-xs font-bold text-slate-700 select-none">
                  {filterYear}
                </div>
                <button
                  onClick={() => handleYearChange('next')}
                  className="px-2 py-2 sm:px-2.5 sm:py-2.5 hover:bg-slate-50 text-slate-600 border-l border-slate-300 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

           {/* Action Buttons */}
           <div className="flex flex-col sm:flex-row items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-200 sm:items-center">
            {isViewingOther && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/grade-management')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Overview
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handlePDFDownload}
              disabled={!subjectEntries.length}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* GENERAL AVERAGE CARD */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {overallAvg && !loading && (
        <Card className="border-l-4 border-l-violet-600 bg-gradient-to-r from-violet-50 to-white">
          <CardBody className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div>
                <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  General Average
                </p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-violet-600">
                    {overallRounded}
                  </div>
                  {overallPerformance && (
                    <Badge variant={overallPerformance.color} className="text-sm px-3 py-1.5">
                      {overallPerformance.label}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-2 font-semibold">
                  Based on {allScores.length} grade{allScores.length === 1 ? '' : 's'} 
                  {filterQuarter && ` (${periodLabel} ${filterQuarter})`}
                </p>
              </div>

              {/* Grade Scale Reference */}
              <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Performance Scale
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="emerald" size="sm">90-100</Badge>
                    <span className="text-slate-600 font-semibold">Outstanding</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="blue" size="sm">85-89</Badge>
                    <span className="text-slate-600 font-semibold">Very Satisfactory</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="amber" size="sm">80-84</Badge>
                    <span className="text-slate-600 font-semibold">Satisfactory</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="orange" size="sm">75-79</Badge>
                    <span className="text-slate-600 font-semibold">Fairly Satisfactory</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="red" size="sm">Below 75</Badge>
                    <span className="text-slate-600 font-semibold">Did Not Meet</span>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STATISTICS CARDS */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {!loading && subjectEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-l-4 border-l-violet-500">
            <CardBody className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl md:text-3xl font-extrabold text-violet-600">
                {subjectEntries.length}
              </div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">
                Total Subjects
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardBody className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl md:text-3xl font-extrabold text-emerald-600">
                {allScores.filter(s => s >= 90).length}
              </div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">
                Outstanding
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardBody className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl md:text-3xl font-extrabold text-amber-600">
                {allScores.filter(s => s >= 75).length}
              </div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">
                Passing
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardBody className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl md:text-3xl font-extrabold text-red-600">
                {allScores.filter(s => s < 75).length}
              </div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">
                Needs Improvement
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* GRADE REPORT TABLE */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <Card>
        <CardHeader divider>
          <CardTitle subtitle={`Detailed grade breakdown for ${subjectEntries.length} subject${subjectEntries.length === 1 ? '' : 's'}`} className="text-lg sm:text-xl">
            Grade Report
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0 sm:p-1">
          {loading ? (
            <Skeleton.Table />
            ) : subjectEntries.length === 0 ? (
              <div className="p-3 sm:p-6 sm:p-8">
                <EmptyState
                title="No Grades Available"
                description={filterQuarter || filterSubject ? "Try adjusting your filters" : "Grades will appear here once they are entered by your teachers"}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider min-w-[180px] sm:min-w-[200px]">
                      Subject
                    </th>
                    {periodShortLabels.map(label => (
                      <th key={label} className="px-2 py-2.5 sm:px-4 sm:py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider w-20 sm:w-24">
                        {label}
                      </th>
                    ))}
                    <th className="px-2 py-2.5 sm:px-4 sm:py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider w-20 sm:w-24 bg-violet-50">
                      Final
                    </th>
                    <th className="px-2 py-2.5 sm:px-4 sm:py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider w-32 sm:w-40">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {subjectEntries.map((entry, idx) => {
                    // Get scores for all grading periods
                    const periodScores = periodValues.map(q => entry.quarters[q]?.raw_score);

                    // Calculate final grade (average of all periods)
                    const scores = periodScores
                      .map(s => parseFloat(s))
                      .filter(s => !isNaN(s));
                    const finalAvg = scores.length 
                      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(0)
                      : null;
                    const performance = getPerformanceLevel(finalAvg);

                    return (
                      <>
                      <tr key={entry.subject_name} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {entry.subject_name}
                        </p>
                        {entry.subject_code && (
                          <Badge variant="slate" size="sm" className="mt-1">
                            {entry.subject_code}
                          </Badge>
                        )}
                        {entry.has_components && (
                          <span className="block text-[10px] text-slate-500 mt-0.5">Combined</span>
                        )}
                      </div>
                    </td>
                    {periodScores.map((score, idx) => (
                      <td key={idx} className="px-2 py-2.5 sm:px-4 sm:py-3 text-center">
                        <ScoreBadge score={score} size="sm" />
                      </td>
                    ))}
                    <td className="px-2 py-2.5 sm:px-4 sm:py-3 text-center bg-violet-50">
                      <ScoreBadge score={finalAvg} size="md" />
                    </td>
                    <td className="px-2 py-2.5 sm:px-4 sm:py-3 text-center">
                          {performance ? (
                            <Badge variant={performance.color} size="sm">
                              {performance.shortLabel}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">—</span>
                          )}
                        </td>
                      </tr>
                      {/* MAPEH component sub-rows */}
                      {entry.has_components && Object.keys(entry.quarters[periodValues[0]]?.components || {}).map(compKey => {
                        const compLabel = compKey === 'music_arts' ? 'Music & Arts' : 'PE & Health';
                        const compScores = periodValues.map(q => entry.quarters[q]?.components?.[compKey]?.raw_score);
                        const compNums = compScores.map(s => parseFloat(s)).filter(s => !isNaN(s));
                        const compAvg = compNums.length ? (compNums.reduce((a, b) => a + b, 0) / compNums.length).toFixed(0) : null;
                        return (
                          <tr key={`${entry.subject_name}-${compKey}`} className="bg-slate-25 hover:bg-slate-50/50">
                            <td className="pl-8 pr-3 py-1.5 sm:pl-12 sm:pr-4 sm:py-2">
                              <p className="text-xs text-slate-600 font-medium">{compLabel}</p>
                            </td>
                            {compScores.map((score, idx) => (
                              <td key={idx} className="px-2 py-1.5 sm:px-4 sm:py-2 text-center">
                                <ScoreBadge score={score} size="sm" />
                              </td>
                            ))}
                            <td className="px-2 py-1.5 sm:px-4 sm:py-2 text-center bg-violet-50">
                              <ScoreBadge score={compAvg} size="sm" />
                            </td>
                            <td className="px-2 py-1.5 sm:px-4 sm:py-2 text-center" />
                          </tr>
                        );
                      })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* FOOTER NOTE */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {!loading && subjectEntries.length > 0 && (
        <Card className="bg-slate-50 border-slate-300">
          <CardBody className="p-3 sm:p-4 text-center">
            <p className="text-xs font-semibold text-slate-600">
              This is an official digital report card from Kiwalan National High School.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </CardBody>
        </Card>
      )}
    </motion.div>
  );
};

export default StudentGradeView;
