import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button, Badge,
  Skeleton, EmptyState
} from '../../components/ui';
import Modal, { ModalBody, ModalFooter, ModalBtnPrimary, ModalBtnSecondary } from '../../components/ui/Modal';
import {
  ArrowLeft, ArrowRight, Users, Award, Search, BarChart2, Trash2, Edit2, Download, X, Check,
  Calendar, CheckCircle, XCircle, Clock as ClockIcon, ShieldCheck, MessageSquare,
  Send, Lock, Unlock, ChevronLeft, ChevronRight, Save, BookOpen
} from 'lucide-react';
import { exportSF10PDF } from '../../utils/sf10PdfExport';
import ScheduleAttendanceEntry from './ScheduleAttendanceEntry';

// Grade Management View - Custom inline implementation with edit, delete, export
export const GradeManagementView = ({ classroom, onBack, navigate }) => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingGrade, setEditingGrade] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  const [exportingSF10, setExportingSF10] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null); // GradeSubmission for current subject
  const [submitting, setSubmitting] = useState(false);
  const [activeQuarters, setActiveQuarters] = useState([1, 2, 3]);

  // Modal state for confirmations
  const [modalState, setModalState] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Load subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get(`/classroom-subjects/by_classroom/?classroom_id=${classroom.id}`);
        setSubjects(res.data);
        if (res.data.length > 0) {
          setSelectedSubject(res.data[0].subject.toString());
        }
      } catch {
        toast.error('Failed to load subjects');
      }
    };
    fetchSubjects();
  }, [classroom.id]);

  // Fetch active semesters for the current academic year
  useEffect(() => {
    const fetchActiveSemesters = async () => {
      try {
        const gpRes = await api.get('/grading-periods/');
        const periods = Array.isArray(gpRes.data) ? gpRes.data : (gpRes.data?.results || []);
        const active = periods
          .filter(p => ['open', 'closing_soon'].includes(p.status))
          .map(p => p.quarter)
          .filter(q => q !== null);
        if (active.length > 0) setActiveQuarters([...new Set(active)].sort());
      } catch {}
    };
    fetchActiveSemesters();
  }, [classroom.id]);

  // Load grades - includes academic_year to avoid cross-year contamination
  const fetchGrades = useCallback(async () => {
    if (!selectedSubject) return;
    setLoading(true);
    setGrades([]);
    try {
      const res = await api.get(
        `/grades/?classroom=${classroom.id}&subject=${selectedSubject}&grade_type=final_grade`
      );
      const relevantGrades = res.data.filter(g => g.subject.toString() === selectedSubject.toString());

      const studentGrades = {};
      relevantGrades.forEach(g => {
        if (!studentGrades[g.student]) {
          studentGrades[g.student] = {
            id: g.student,
            name: g.student_name,
            email: g.student_email,
            quarters: {},
            gradeIds: {},
            gradeData: {},
            locked: {},
            remarks: {},
          };
        }
        studentGrades[g.student].quarters[`q${g.quarter}`] = parseFloat(g.raw_score);
        studentGrades[g.student].gradeIds[`q${g.quarter}`] = g.id;
        studentGrades[g.student].gradeData[`q${g.quarter}`] = g;
        studentGrades[g.student].locked[`q${g.quarter}`] = g.is_locked;
        studentGrades[g.student].remarks[`q${g.quarter}`] = g.computed_remarks;
      });
      setGrades(Object.values(studentGrades));
    } catch {
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, [classroom.id, selectedSubject]);

  // Load submission status for current subject
  const fetchSubmissionStatus = useCallback(async () => {
    if (!selectedSubject) { setSubmissionStatus(null); return; }
    try {
      const res = await api.get(
        `/grade-submissions/?classroom=${classroom.id}&subject=${selectedSubject}`
      );
      const subs = res.data?.results || res.data || [];
      // Take the most recent one
      setSubmissionStatus(subs.length > 0 ? subs[0] : null);
    } catch {
      setSubmissionStatus(null);
    }
  }, [classroom.id, selectedSubject]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);
  useEffect(() => { fetchSubmissionStatus(); }, [fetchSubmissionStatus]);

  const filteredGrades = useMemo(() => {
    if (!searchQuery) return grades;
    const query = searchQuery.toLowerCase();
    return grades.filter(g => g.name?.toLowerCase().includes(query));
  }, [grades, searchQuery]);

  // Per-quarter filtered display
  const displayedQuarters = selectedQuarter === 'all' ? ['q1', 'q2', 'q3'] : [selectedQuarter];

  const calculateFinalGrade = (quarters) => {
    const scores = Object.values(quarters).filter(s => !isNaN(s));
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  };

  const getRemarksLabel = (avg) => {
    if (avg == null) return null;
    const v = parseFloat(avg);
    if (v >= 90) return 'Outstanding';
    if (v >= 85) return 'Very Satisfactory';
    if (v >= 80) return 'Satisfactory';
    if (v >= 75) return 'Fairly Satisfactory';
    return 'Did Not Meet Expectations';
  };

  const getPerformanceColor = (grade) => {
    if (!grade) return 'slate';
    if (grade >= 90) return 'green';
    if (grade >= 85) return 'blue';
    if (grade >= 80) return 'violet';
    if (grade >= 75) return 'amber';
    return 'red';
  };

  const getRemarksColor = (remarks) => {
    if (!remarks) return 'text-slate-400';
    if (remarks === 'Outstanding') return 'text-emerald-600';
    if (remarks === 'Very Satisfactory') return 'text-blue-600';
    if (remarks === 'Satisfactory') return 'text-violet-600';
    if (remarks === 'Fairly Satisfactory') return 'text-amber-600';
    return 'text-red-600';
  };

  // Stats summary
  const stats = useMemo(() => {
    const allFinals = filteredGrades.map(s => {
      const fg = calculateFinalGrade(s.quarters);
      return fg ? parseFloat(fg) : null;
    }).filter(v => v !== null);
    if (allFinals.length === 0) return null;
    const avg = (allFinals.reduce((a, b) => a + b, 0) / allFinals.length).toFixed(2);
    const passing = allFinals.filter(v => v >= 75).length;
    return {
      avg, passing, failing: allFinals.length - passing, total: allFinals.length,
      highest: Math.max(...allFinals), lowest: Math.min(...allFinals),
    };
  }, [filteredGrades]);

  const handleEdit = (studentId, quarter, currentGrade, isLocked) => {
    if (isLocked) { toast.error('This grade is locked and cannot be edited'); return; }
    setEditingGrade({ studentId, quarter });
    setEditValue(currentGrade?.toString() || '');
  };

  const handleSaveEdit = async () => {
    if (!editingGrade) return;
    const { studentId, quarter } = editingGrade;
    const student = grades.find(g => g.id === studentId);
    const gradeId = student?.gradeIds[quarter];
    const originalGrade = student?.gradeData[quarter];
    if (!gradeId || !originalGrade) { toast.error('Grade record not found'); setEditingGrade(null); return; }
    if (originalGrade.subject.toString() !== selectedSubject.toString()) {
      toast.error('Subject mismatch — please refresh and try again'); setEditingGrade(null); return;
    }
    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue < 0 || newValue > 100) { toast.error('Invalid grade value (0-100)'); return; }
    try {
      await api.put(`/grades/${gradeId}/`, {
        student: originalGrade.student, subject: originalGrade.subject,
        classroom: originalGrade.classroom, teacher: originalGrade.teacher,
        grade_type: originalGrade.grade_type, quarter: originalGrade.quarter,
        academic_year: originalGrade.academic_year, raw_score: newValue,
        total_score: originalGrade.total_score || 100,
      });
      toast.success('Grade updated');
      setEditingGrade(null);
      fetchGrades();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.detail || 'Failed to update grade');
    }
  };

  const handleDelete = async (studentId, quarter) => {
    const student = grades.find(g => g.id === studentId);
    const gradeId = student?.gradeIds[quarter];
    const gradeData = student?.gradeData[quarter];
    if (!gradeId) { toast.error('Grade record not found'); return; }
    if (gradeData?.is_locked) { toast.error('This grade is locked'); return; }
    if (gradeData && gradeData.subject.toString() !== selectedSubject.toString()) {
      toast.error('Subject mismatch — please refresh and try again'); return;
    }
    setModalState({
      open: true, title: 'Delete Grade?',
      message: `Delete ${quarter.toUpperCase()} grade for ${student.name}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`/grades/${gradeId}/`);
          toast.success('Grade deleted');
          fetchGrades();
          setModalState(prev => ({ ...prev, open: false }));
        } catch (error) {
          toast.error(error.response?.data?.error || error.response?.data?.detail || 'Failed to delete grade');
        }
      }
    });
  };

  const handleDeleteAllQuarter = async () => {
    if (selectedQuarter === 'all') { toast.error('Select a specific term to delete'); return; }
    setModalState({
      open: true, title: 'Delete All Term Grades?',
      message: `Delete ALL ${selectedQuarter.toUpperCase()} grades for this class? This cannot be undone.`,
      onConfirm: async () => {
        let successCount = 0; let errorCount = 0;
        for (const student of grades) {
          const gradeId = student.gradeIds[selectedQuarter];
          if (gradeId) {
            try { await api.delete(`/grades/${gradeId}/`); successCount++; }
            catch { errorCount++; }
          }
        }
        if (successCount > 0) { toast.success(`Deleted ${successCount} grade(s)`); fetchGrades(); }
        if (errorCount > 0) toast.error(`Failed to delete ${errorCount} grade(s).`);
        setModalState(prev => ({ ...prev, open: false }));
      }
    });
  };

  // Submit for admin review
  const handleSubmitForReview = async () => {
    if (!submissionStatus?.id) { toast.error('No submission record found — enter grades first'); return; }
    setSubmitting(true);
    try {
      await api.post(`/grade-submissions/${submissionStatus.id}/submit/`);
      toast.success('Grades submitted for review');
      fetchSubmissionStatus();
    } catch (err) {
      const warnings = err.response?.data?.warnings;
      if (warnings) {
        toast.error(`${err.response.data.warning_count} validation warning(s) — check for missing grades`);
      } else {
        toast.error(err.response?.data?.error || 'Failed to submit');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (filteredGrades.length === 0) { toast.error('No data to export'); return; }
    const subjectName = subjects.find(s => s.subject.toString() === selectedSubject)?.subject_name || 'grades';
    const headers = ['#', 'Student Name', 'LRN', 'T1', 'T2', 'T3', 'Final Grade', 'Remarks'];
    const rows = filteredGrades.map((student, idx) => {
      const finalGrade = calculateFinalGrade(student.quarters);
      const finalNum = finalGrade ? Math.round(parseFloat(finalGrade)) : '';
      return [
        idx + 1, student.name, student.lrn || '',
        student.quarters.q1 !== undefined ? Math.round(student.quarters.q1) : '',
        student.quarters.q2 !== undefined ? Math.round(student.quarters.q2) : '',
        student.quarters.q3 !== undefined ? Math.round(student.quarters.q3) : '',
        finalNum,
        finalNum !== '' ? (finalNum >= 75 ? 'Passed' : 'Failed') : '',
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(row => row.map(v => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${classroom.name}_${subjectName}.csv`; a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const handleExportSF10 = async () => {
    setExportingSF10(true);
    try {
      const enrollRes = await api.get(`/enrollments/?classroom=${classroom.id}`);
      const enrolledStudents = enrollRes.data;
      if (!enrolledStudents.length) { toast.error('No enrolled students found'); setExportingSF10(false); return; }
      const gradesRes = await api.get(`/grades/?classroom=${classroom.id}&grade_type=final_grade`);
      const allGrades = gradesRes.data;
      let schoolYear = ''; let gradeLevel = '';
      try { const s = await api.get('/system/settings/'); schoolYear = s.data?.academic_year || ''; gradeLevel = s.data?.current_grade_level || ''; } catch { /* ignore */ }
      const adviser = subjects[0]?.teacher_name || '';
      await exportSF10PDF(classroom, enrolledStudents, allGrades, { schoolYear, gradeLevel, section: classroom.name, adviser }, subjects);
      toast.success('SF10 PDF exported');
    } catch (err) {
      if (err.message?.includes('Template file not found')) toast.error('SF10 template missing. Place SF10_Template.xlsx in frontend/public/templates/', { duration: 5000 });
      else toast.error('Failed to export SF10: ' + (err.message || 'Unknown error'));
    } finally { setExportingSF10(false); }
  };

  // Submission status banner config
  const subStatusConfig = {
    draft:       { color: 'bg-slate-50 border-slate-200', text: 'text-slate-600', label: 'Draft', hint: 'Grades not yet submitted for review.' },
    in_progress: { color: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',  label: 'In Progress', hint: 'Grade entry in progress.' },
    submitted:   { color: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', label: 'Submitted', hint: 'Awaiting admin review.' },
    reviewed:    { color: 'bg-cyan-50 border-cyan-200',   text: 'text-cyan-700',  label: 'Reviewed', hint: 'Under review by admin.' },
    approved:    { color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Approved', hint: 'Grades approved.' },
    locked:      { color: 'bg-violet-50 border-violet-200', text: 'text-violet-700', label: 'Locked', hint: 'Grades are locked. Request reopening if needed.' },
  };
  const ssc = submissionStatus ? (subStatusConfig[submissionStatus.status] || subStatusConfig.draft) : null;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Overview
        </Button>
        <div className="flex gap-2 flex-wrap">
          {/* Submit for Review */}
          {submissionStatus && ['draft', 'in_progress'].includes(submissionStatus.status) && (
            <Button
              size="sm"
              onClick={handleSubmitForReview}
              loading={submitting}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Review
            </Button>
          )}
          {navigate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/teacher-grade-dashboard')}
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!selectedSubject || filteredGrades.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSF10}
            disabled={exportingSF10}
            loading={exportingSF10}
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportingSF10 ? 'Generating...' : 'SF10 PDF'}
          </Button>
        </div>
      </div>

      {/* Submission status banner */}
      {ssc && (
        <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${ssc.color}`}>
          <div className="flex items-center gap-3">
            {submissionStatus.status === 'locked' ? (
              <Lock className={`w-4 h-4 flex-shrink-0 ${ssc.text}`} />
            ) : submissionStatus.status === 'approved' ? (
              <CheckCircle className={`w-4 h-4 flex-shrink-0 ${ssc.text}`} />
            ) : (
              <ClockIcon className={`w-4 h-4 flex-shrink-0 ${ssc.text}`} />
            )}
            <div>
              <span className={`text-sm font-bold ${ssc.text}`}>
                Submission: {ssc.label}
              </span>
              <span className="text-xs text-slate-500 ml-2">{ssc.hint}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-slate-500">
              {submissionStatus.graded_count}/{submissionStatus.total_students} graded
              {submissionStatus.missing_count > 0 && (
                <span className="text-red-500 ml-1">· {submissionStatus.missing_count} missing</span>
              )}
            </span>
            {submissionStatus.status === 'locked' && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-violet-300 text-violet-700 hover:bg-violet-50"
                onClick={() => navigate?.('/teacher-grade-dashboard')}
              >
                <Unlock className="w-3 h-3 mr-1" />
                Request Reopen
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Rejection reason */}
      {submissionStatus?.rejection_reason && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Submission Rejected</p>
            <p className="text-xs text-red-600 mt-0.5">{submissionStatus.rejection_reason}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader divider>
          <div className="flex items-center justify-between">
            <CardTitle>Grade Management — {classroom.name}</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="p-3 sm:p-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.subject}>{s.subject_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Term Filter</label>
              <select
                value={selectedQuarter}
                onChange={e => setSelectedQuarter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Terms</option>
                {[1, 2, 3].map(q => (
                  <option key={q} value={`q${q}`} disabled={!activeQuarters.includes(q)}>
                    Term {q}{!activeQuarters.includes(q) ? ' (Locked)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Search Students</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Stats summary bar */}
          {stats && (
            <div className="grid grid-cols-5 gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              {[
                { label: 'Students', value: stats.total, color: 'text-slate-700' },
                { label: 'Avg Grade', value: stats.avg, color: 'text-violet-700' },
                { label: 'Highest', value: stats.highest, color: 'text-emerald-700' },
                { label: 'Lowest', value: stats.lowest, color: stats.lowest < 75 ? 'text-red-600' : 'text-amber-600' },
                { label: 'Passing', value: `${stats.passing}/${stats.total}`, color: stats.failing > 0 ? 'text-amber-600' : 'text-emerald-700' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bulk delete for specific term */}
          {selectedQuarter !== 'all' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-900 font-medium">
                  Bulk Actions for {selectedQuarter.toUpperCase()}
                </span>
              </div>
              <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleDeleteAllQuarter}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All {selectedQuarter.toUpperCase()}
              </Button>
            </div>
          )}

          {/* Grades Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Skeleton.Table rows={5} cols={7} />
            </div>
          ) : !selectedSubject ? (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Select a subject to view grades</p>
            </div>
          ) : filteredGrades.length === 0 ? (
            <EmptyState
              title="No Grades Found"
              description={searchQuery ? "No students match your search" : "No grades have been entered yet"}
              icon={<Award className="w-8 h-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Student</th>
                    {displayedQuarters.map(q => (
                      <th key={q} className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">
                        {q.toUpperCase()}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Final</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredGrades.map((student, idx) => {
                    const finalGrade = calculateFinalGrade(student.quarters);
                    const finalRemarks = getRemarksLabel(finalGrade ? parseFloat(finalGrade) : null);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-500 font-semibold">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs flex-shrink-0">
                              {student.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                            </div>
                            <span className="text-sm font-semibold text-slate-900">{student.name}</span>
                          </div>
                        </td>
                        {displayedQuarters.map(quarter => {
                          const isLocked = student.locked?.[quarter];
                          return (
                            <td key={quarter} className="px-4 py-3 text-center">
                              {editingGrade?.studentId === student.id && editingGrade?.quarter === quarter ? (
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingGrade(null); }}
                                    className="w-16 px-2 py-1 text-sm border border-violet-300 rounded focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    min="0" max="100" autoFocus
                                  />
                                  <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingGrade(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : student.quarters[quarter] !== undefined ? (
                                <div className="inline-flex items-center gap-1">
                                  {isLocked && <Lock className="w-3 h-3 text-violet-400 flex-shrink-0" title="Locked" />}
                                  <Badge variant={getPerformanceColor(student.quarters[quarter])} className="font-semibold">
                                    {student.quarters[quarter]}
                                  </Badge>
                                  {!isLocked && (
                                    <div className="flex gap-0.5 ml-0.5">
                                      <button
                                        onClick={() => handleEdit(student.id, quarter, student.quarters[quarter], false)}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Edit grade"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(student.id, quarter)}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Delete grade"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          {finalGrade ? (
                            <Badge variant={getPerformanceColor(parseFloat(finalGrade))} className="font-bold text-base px-3 py-1">
                              {Math.round(parseFloat(finalGrade))}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {finalRemarks ? (
                            <span className={`text-xs font-semibold ${getRemarksColor(finalRemarks)}`}>
                              {finalRemarks}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalState.open}
        onClose={() => setModalState(prev => ({ ...prev, open: false }))}
        title={modalState.title}
        size="md"
      >
        <ModalBody>
          <p className="text-sm text-slate-700">{modalState.message}</p>
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setModalState(prev => ({ ...prev, open: false }))}>Cancel</ModalBtnSecondary>
          <ModalBtnPrimary onClick={() => modalState.onConfirm?.()}>Confirm</ModalBtnPrimary>
        </ModalFooter>
      </Modal>
    </div>
  );
};

// Attendance Schedule Selector - Shows teacher's scheduled periods for a classroom
const AttendanceScheduleSelector = ({ classroom, onBack }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchedules();
  }, [classroom.id, selectedDate]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/teacher-dashboard/', { params: { date: selectedDate } });
      if (!res.data.is_holiday) {
        const classSchedules = (res.data.classes || []).filter(
          c => c.classroom_id === classroom.id
        );
        setSchedules(classSchedules);
      } else {
        setSchedules([]);
      }
    } catch {
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  const goToPrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d <= today) {
      setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Back to Overview</span>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToPrevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <Button variant="ghost" size="sm" onClick={goToNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Schedule Info */}
      <Card>
        <CardHeader divider>
          <CardTitle>My Scheduled Periods — {dateLabel}</CardTitle>
        </CardHeader>
        <CardBody className="p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton.ListItem key={i} />)}
            </div>
          ) : schedules.length === 0 ? (
            <EmptyState
              title="No Periods Today"
              description="You don't have any scheduled periods for this class on this date."
              icon={<Calendar className="w-8 h-8" />}
            />
          ) : (
            <div className="space-y-3">
              {schedules.map((sch) => (
                <div
                  key={sch.schedule_id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate(`/my-classes?classroom=${classroom.id}&view=attendance&schedule=${sch.schedule_id}&date=${selectedDate}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      sch.status === 'completed' ? 'bg-green-100' : 'bg-amber-100'
                    }`}>
                      <BookOpen className={`w-5 h-5 ${sch.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{sch.subject_name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>{sch.start_time} - {sch.end_time}</span>
                        {sch.room && <span className="text-slate-400">| {sch.room}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-500">{sch.recorded}/{sch.student_count} recorded</p>
                      <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-full rounded-full transition-all ${
                            sch.completion >= 100 ? 'bg-green-500' : sch.completion >= 75 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${sch.completion}%` }}
                        />
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      sch.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {sch.status === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

// Attendance View - Supports both class-level (adviser) and schedule-based (subject teacher) modes
export const AttendanceView = ({ classroom, onBack, isStudent, isTeacher, scheduleId, selectedDate: dateProp, onClearSchedule }) => {
  // If a scheduleId is provided, render the schedule-based entry component
  if (scheduleId && isTeacher) {
    const attDate = dateProp || (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
    return (
      <ScheduleAttendanceEntry
        scheduleId={scheduleId}
        date={attDate}
        classroom={classroom}
        onBack={onClearSchedule || onBack}
      />
    );
  }

  // Schedule selector mode for teachers without a specific schedule
  if (isTeacher && !isStudent) {
    return (
      <AttendanceScheduleSelector
        classroom={classroom}
        onBack={onBack}
      />
    );
  }

  // Original class-level attendance for students (read-only) and advisers
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [remarks, setRemarks] = useState({}); // student_id -> remark text
  const [holidayInfo, setHolidayInfo] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/enrollments/?classroom=${classroom.id}`);
        const sorted = res.data.sort((a, b) => {
          const nameA = (a.student_name || '').toLowerCase();
          const nameB = (b.student_name || '').toLowerCase();
          const lastA = nameA.split(' ').pop();
          const lastB = nameB.split(' ').pop();
          const cmp = lastA.localeCompare(lastB);
          return cmp !== 0 ? cmp : nameA.localeCompare(nameB);
        });
        setStudents(sorted);
        const initAttendance = {};
        sorted.forEach(s => { initAttendance[s.student] = null; });
        setAttendance(initAttendance);
      } catch {
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [classroom.id]);

  useEffect(() => {
    const fetchAttendance = async () => {
      setHolidayInfo(null);
      try {
        // Check if date is a holiday
        const holidayRes = await api.get(`/school-calendar/check/?date=${selectedDate}`);
        if (holidayRes.data.is_holiday) {
          setHolidayInfo(holidayRes.data);
          setAttendance({});
          setExistingRecords({});
          return;
        }
        const res = await api.get(`/attendance/?classroom=${classroom.id}&date=${selectedDate}`);
        const attendanceMap = {};
        const recMap = {};
        let wfStatus = 'draft';
        res.data.forEach(a => {
          attendanceMap[a.student] = a.status;
          recMap[a.student] = a.id;
          if (a.workflow_status) wfStatus = a.workflow_status;
        });
        setExistingRecords(recMap);
        setWorkflowStatus(wfStatus);
        setAttendance(prev => {
          const next = {};
          Object.keys(prev).forEach(studentId => {
            next[studentId] = studentId in attendanceMap ? attendanceMap[studentId] : null;
          });
          return next;
        });
      } catch {
        console.error('Failed to load attendance');
      }
    };
    if (selectedDate) fetchAttendance();
  }, [selectedDate, classroom.id]);

  // Existing records map for detecting new vs existing
  const [existingRecords, setExistingRecords] = useState({});

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    const updated = {};
    students.forEach(s => { updated[s.student] = 'present'; });
    setAttendance(updated);
    toast.success('All students marked present');
  };

  const saveAllRecords = async () => {
    const markedStudents = Object.entries(attendance).filter(([, status]) => status !== null);
    if (markedStudents.length === 0) {
      toast.error('No attendance to save');
      return false;
    }

    console.log('[Attendance] Saving', markedStudents.length, 'records. Sample:', { student: parseInt(markedStudents[0][0]), classroom: classroom.id, date: selectedDate, status: markedStudents[0][1] });
    const savePromises = markedStudents.map(([studentId, status]) => {
      const payload = {
        student: parseInt(studentId),
        classroom: classroom.id,
        date: selectedDate,
        status,
        remarks: remarks[studentId] || '',
        schedule_id: null,
      };
      if (existingRecords[studentId]) {
        return api.put(`/attendance/${existingRecords[studentId]}/`, payload);
      }
      return api.post('/attendance/', payload);
    });

    const results = await Promise.allSettled(savePromises);
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      const msgs = failed.map(r => r.reason?.response?.data ? JSON.stringify(r.reason.response.data) : r.reason?.message).join('; ');
      console.error('Save errors:', msgs);
      toast.error(`Failed to save ${failed.length} record(s): ${msgs}`);
      return false;
    }

    // Refresh existing records map
    try {
      const res = await api.get(`/attendance/?classroom=${classroom.id}&date=${selectedDate}`);
      const recMap = {};
      res.data.forEach(a => { recMap[a.student] = a.id; });
      setExistingRecords(recMap);
    } catch { /* ignore */ }

    return true;
  };

  const stats = useMemo(() => {
    const present = Object.values(attendance).filter(s => s === 'present').length;
    const absent = Object.values(attendance).filter(s => s === 'absent').length;
    const late = Object.values(attendance).filter(s => s === 'late').length;
    const excused = Object.values(attendance).filter(s => s === 'excused').length;
    const unmarked = Object.values(attendance).filter(s => s === null).length;
    return { present, absent, late, excused, unmarked, total: students.length };
  }, [attendance, students.length]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      (s.student_name || '').toLowerCase().includes(q) ||
      (s.student_email || '').toLowerCase().includes(q) ||
      (s.student_lrn || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const statusConfig = {
    present:  { active: 'bg-green-600 text-white', idle: 'bg-green-50 text-green-700 hover:bg-green-100', icon: CheckCircle },
    absent:   { active: 'bg-red-600 text-white',   idle: 'bg-red-50 text-red-700 hover:bg-red-100',   icon: XCircle },
    late:     { active: 'bg-amber-600 text-white',  idle: 'bg-amber-50 text-amber-700 hover:bg-amber-100', icon: ClockIcon },
    excused:  { active: 'bg-blue-600 text-white',   idle: 'bg-blue-50 text-blue-700 hover:bg-blue-100',   icon: ShieldCheck },

  };

  // Track workflow status per date
  const [workflowStatus, setWorkflowStatus] = useState('draft');

  const handleSubmitAll = async () => {
    if (workflowStatus !== 'draft') {
      toast.error('Attendance already submitted');
      return;
    }
    const markedCount = Object.values(attendance).filter(s => s !== null).length;
    if (markedCount === 0) {
      toast.error('No attendance records to submit');
      return;
    }
    setSubmitting(true);
    try {
      // Save all records first
      const saved = await saveAllRecords();
      if (!saved) {
        setSubmitting(false);
        return;
      }

      await api.post('/attendance/submit/', {
        classroom_id: classroom.id,
        date: selectedDate,
      });
      toast.success('Attendance submitted for admin review');
      setWorkflowStatus('submitted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (workflowStatus === 'draft') {
      toast.error('Attendance is already in draft');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/attendance/reopen/', {
        classroom_id: classroom.id,
        date: selectedDate,
      });
      toast.success('Attendance reopened for editing');
      setWorkflowStatus('draft');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reopen');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Back to Overview</span>
        </Button>
        <div className="flex items-center gap-2">
          {/* Workflow Status Badge */}
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
            workflowStatus === 'submitted' ? 'bg-green-100 text-green-700' :
            workflowStatus === 'locked' ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {workflowStatus}
          </span>
          {!isStudent && workflowStatus === 'draft' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  setSubmitting(true);
                  await saveAllRecords();
                  setSubmitting(false);
                }}
                loading={submitting}
              >
                <Save className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Save</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitAll}
                loading={submitting}
              >
                <Send className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Submit</span>
                <span className="sm:hidden">Submit</span>
              </Button>
            </>
          )}
          {!isStudent && workflowStatus === 'submitted' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReopen}
              loading={submitting}
            >
              <Unlock className="w-4 h-4 mr-1.5" />
              Reopen
            </Button>
          )}
          {!isStudent && workflowStatus === 'locked' && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              Locked
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader divider>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>Attendance - {classroom.name}</CardTitle>
            <div className="flex items-center gap-2">
              {!isStudent && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={markAllPresent} className="text-xs">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    All Present
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const reset = {};
                    students.forEach(s => { reset[s.student] = null; });
                    setAttendance(reset);
                    toast.success('All cleared');
                  }} className="text-xs text-slate-500">
                    Clear
                  </Button>
                </div>
              )}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-4 md:p-6">
          {/* Date Selector */}
          <div className="mb-4 md:mb-6">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-3 mb-4 md:mb-6">
            <div className="bg-slate-50 rounded-lg p-1.5 sm:p-2 md:p-3 text-center">
              <div className="text-sm sm:text-lg md:text-xl font-bold text-slate-700">{stats.total}</div>
              <div className="text-[7px] sm:text-[9px] md:text-[10px] text-slate-600 uppercase font-semibold mt-0.5">Total</div>
            </div>
            <div className="bg-green-50 rounded-lg p-1.5 sm:p-2 md:p-3 text-center">
              <div className="text-sm sm:text-lg md:text-xl font-bold text-green-600">{stats.present}</div>
              <div className="text-[7px] sm:text-[9px] md:text-[10px] text-green-700 uppercase font-semibold mt-0.5">Present</div>
            </div>
            <div className="bg-red-50 rounded-lg p-1.5 sm:p-2 md:p-3 text-center">
              <div className="text-sm sm:text-lg md:text-xl font-bold text-red-600">{stats.absent}</div>
              <div className="text-[7px] sm:text-[9px] md:text-[10px] text-red-700 uppercase font-semibold mt-0.5">Absent</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-1.5 sm:p-2 md:p-3 text-center">
              <div className="text-sm sm:text-lg md:text-xl font-bold text-amber-600">{stats.late}</div>
              <div className="text-[7px] sm:text-[9px] md:text-[10px] text-amber-700 uppercase font-semibold mt-0.5">Late</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-1.5 sm:p-2 md:p-3 text-center">
              <div className="text-sm sm:text-lg md:text-xl font-bold text-blue-600">{stats.excused}</div>
              <div className="text-[7px] sm:text-[9px] md:text-[10px] text-blue-700 uppercase font-semibold mt-0.5">Excused</div>
            </div>
          </div>

          {/* Attendance List */}
          {holidayInfo ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{holidayInfo.title}</h3>
              <p className="text-sm text-slate-500">{holidayInfo.type_display} &mdash; No classes</p>
              {holidayInfo.description && <p className="text-xs text-slate-400 mt-1">{holidayInfo.description}</p>}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <Skeleton.Table rows={5} cols={4} />
            </div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              title="No Students"
              description={searchQuery ? "No students match your search" : "No students enrolled in this class"}
              icon={<Users className="w-8 h-8" />}
            />
          ) : (
            <>
              {['male', 'female'].map(sex => {
                const group = filteredStudents.filter(s => (s.student_sex || '').toLowerCase() === sex);
                if (group.length === 0) return null;
                return (
                  <div key={sex} className="mb-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-2 px-1">
                      {sex === 'male' ? 'Male' : 'Female'} Students ({group.length})
                    </h3>
                    {/* Mobile: card layout */}
                    <div className="md:hidden space-y-2">
                      {group.map((student) => (
                        <div key={student.id} className="p-3 bg-white border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${sex === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                              {student.student_name ? student.student_name.trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('') : '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {student.student_name || 'Unknown Student'}
                              </p>
                              <div className="flex gap-1 mt-1.5">
                                {Object.entries(statusConfig).map(([key, cfg]) => {
                                  const Icon = cfg.icon;
                                  const isActive = attendance[student.student] === key;
                                  return (
                                    <button
                                      key={key}
                                      onClick={() => handleStatusChange(student.student, key)}
                                      title={key.charAt(0).toUpperCase() + key.slice(1)}
                                      disabled={isStudent}
                                      className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${isActive ? cfg.active : cfg.idle} ${isStudent ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <Icon className="w-3.5 h-3.5" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          {!isStudent && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                              <input
                                type="text"
                                value={remarks[student.student] || ''}
                                onChange={e => setRemarks(prev => ({ ...prev, [student.student]: e.target.value }))}
                                placeholder="Remark..."
                                className="flex-1 text-[11px] px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop: table layout */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase w-10">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Student</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Status</th>
                            {!isStudent && <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase w-48">Remarks</th>}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {group.map((student, idx) => (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${sex === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                    {student.student_name ? student.student_name.trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('') : '?'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                      {student.student_name || 'Unknown Student'}
                                    </p>
                                    {student.student_lrn && (
                                      <p className="text-xs text-slate-400 truncate">LRN: {student.student_lrn}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  {Object.entries(statusConfig).map(([key, cfg]) => {
                                    const Icon = cfg.icon;
                                    const isActive = attendance[student.student] === key;
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => handleStatusChange(student.student, key)}
                                        title={key.charAt(0).toUpperCase() + key.slice(1)}
                                        disabled={isStudent}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${isActive ? cfg.active : cfg.idle} ${isStudent ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              {!isStudent && (
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={remarks[student.student] || ''}
                                    onChange={e => setRemarks(prev => ({ ...prev, [student.student]: e.target.value }))}
                                    placeholder="Optional remark..."
                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-400"
                                  />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

// Attendance History View - Date-focused with edit/delete
export const AttendanceHistoryView = ({ classroom, onBack }) => {
  const [students, setStudents] = useState([]);
  const todayDate = useMemo(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; }, []);
  const [selectedYear, setSelectedYear] = useState(todayDate.year);
  const [selectedMonth, setSelectedMonth] = useState(todayDate.month);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayAbbr = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Build weekday dates for the selected month (Mon-Fri only)
  const weekdayDates = useMemo(() => {
    const days = [];
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(selectedYear, selectedMonth - 1, d);
      const dow = date.getDay();
      if (dow >= 1 && dow <= 5) {
        const mm = String(selectedMonth).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        days.push({
          dateStr: `${selectedYear}-${mm}-${dd}`,
          dayNum: d,
          dayAbbr: dayAbbr[dow],
          dow,
        });
      }
    }
    return days;
  }, [selectedYear, selectedMonth]);

  // Group weekday dates by week (Mon-Fri block) for week headers
  const weekGroups = useMemo(() => {
    const groups = [];
    let currentWeek = [];
    weekdayDates.forEach((wd) => {
      if (wd.dow === 1 && currentWeek.length > 0) {
        groups.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(wd);
    });
    if (currentWeek.length > 0) groups.push(currentWeek);
    return groups;
  }, [weekdayDates]);

  // Load enrolled students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get(`/enrollments/?classroom=${classroom.id}`);
        const sorted = res.data.sort((a, b) => {
          const nameA = (a.student_name || '').toLowerCase();
          const nameB = (b.student_name || '').toLowerCase();
          const lastA = nameA.split(' ').pop();
          const lastB = nameB.split(' ').pop();
          const cmp = lastA.localeCompare(lastB);
          return cmp !== 0 ? cmp : nameA.localeCompare(nameB);
        });
        setStudents(sorted);
      } catch {
        toast.error('Failed to load students');
      }
    };
    fetchStudents();
  }, [classroom.id]);

  // Load attendance for selected month
  useEffect(() => {
    const fetchMonth = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/attendance/?classroom=${classroom.id}&month=${selectedMonth}&year=${selectedYear}`);
        setRecords(res.data.results || res.data || []);
      } catch {
        toast.error('Failed to load attendance');
      } finally {
        setLoading(false);
      }
    };
    fetchMonth();
  }, [classroom.id, selectedMonth, selectedYear]);

  // Build lookup map: dateStr -> studentId -> record
  const attendanceMap = useMemo(() => {
    const map = {};
    records.forEach(rec => {
      if (!map[rec.date]) map[rec.date] = {};
      map[rec.date][rec.student] = rec;
    });
    return map;
  }, [records]);

  // Merge students with attendance for display
  const filteredStudents = useMemo(() => {
    let list = students;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        (s.student_name || '').toLowerCase().includes(q) ||
        (s.student_lrn || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, searchQuery]);

  // Split by sex
  const maleStudents = useMemo(() => filteredStudents.filter(s => (s.student_sex || '').toLowerCase() === 'male'), [filteredStudents]);
  const femaleStudents = useMemo(() => filteredStudents.filter(s => (s.student_sex || '').toLowerCase() === 'female'), [filteredStudents]);

  // Compute per-row stats
  const getStudentStats = useCallback((studentId) => {
    let prs = 0, abs = 0, late = 0, exc = 0;
    weekdayDates.forEach(wd => {
      const rec = attendanceMap[wd.dateStr]?.[studentId];
      if (!rec) return;
      switch (rec.status) {
        case 'present': prs++; break;
        case 'absent': abs++; break;
        case 'late': late++; break;
        case 'excused': exc++; break;
      }
    });
    const total = prs + abs + late + exc;
    const pct = total > 0 ? Math.round((prs / total) * 100) : 0;
    return { prs, abs, late, exc, pct };
  }, [attendanceMap, weekdayDates]);

  // Compute section totals
  const getSectionTotals = useCallback((studentList) => {
    let prs = 0, abs = 0, late = 0, exc = 0;
    studentList.forEach(s => {
      const st = getStudentStats(s.student);
      prs += st.prs; abs += st.abs; late += st.late; exc += st.exc;
    });
    const total = prs + abs + late + exc;
    const pct = total > 0 ? Math.round((prs / total) * 100) : 0;
    return { prs, abs, late, exc, pct };
  }, [getStudentStats]);

  const maleTotals = useMemo(() => getSectionTotals(maleStudents), [getSectionTotals, maleStudents]);
  const femaleTotals = useMemo(() => getSectionTotals(femaleStudents), [getSectionTotals, femaleStudents]);
  const grandTotals = useMemo(() => ({
    prs: maleTotals.prs + femaleTotals.prs,
    abs: maleTotals.abs + femaleTotals.abs,
    late: maleTotals.late + femaleTotals.late,
    exc: maleTotals.exc + femaleTotals.exc,
    ...(maleStudents.length + femaleStudents.length > 0 ? {
      pct: Math.round(((maleTotals.prs + femaleTotals.prs) / (maleTotals.prs + maleTotals.abs + maleTotals.late + maleTotals.exc + femaleTotals.prs + femaleTotals.abs + femaleTotals.late + femaleTotals.exc)) * 100)
    } : { pct: 0 }),
  }), [maleTotals, femaleTotals]);

  const statusCell = (status) => {
    switch (status) {
      case 'present': return <span className="text-green-600 font-bold">P</span>;
      case 'absent': return <span className="text-red-600 font-bold">A</span>;
      case 'late': return <span className="text-amber-600 font-bold">L</span>;
      case 'excused': return <span className="text-blue-600 font-bold">E</span>;
      default: return <span className="text-slate-300">—</span>;
    }
  };

  const navMonth = (delta) => {
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    // Don't go past current month
    if (y > todayDate.year || (y === todayDate.year && m > todayDate.month)) return;
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const headerRow = (studentList, sectionLabel, isGrand) => (
    <tr className={isGrand ? 'bg-indigo-50' : 'bg-slate-50'}>
      <th colSpan={4} className={`px-3 py-2 text-left text-xs font-bold ${isGrand ? 'text-indigo-700' : 'text-slate-700'} uppercase`}>
        {sectionLabel}
      </th>
      <th className="px-2 py-2 text-center text-xs font-bold text-slate-500">Prs</th>
      <th className="px-2 py-2 text-center text-xs font-bold text-slate-500">Abs</th>
      <th className="px-2 py-2 text-center text-xs font-bold text-slate-500">Late</th>
      <th className="px-2 py-2 text-center text-xs font-bold text-slate-500">Exc</th>
      <th className="px-2 py-2 text-center text-xs font-bold text-slate-500">%</th>
    </tr>
  );

  const studentRow = (student, idx) => {
    const st = getStudentStats(student.student);
    return (
      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
        <td className="px-2 py-1.5 text-xs text-slate-500 text-center font-medium">{idx + 1}</td>
        <td className="px-2 py-1.5 text-xs text-slate-700 max-w-[120px] truncate" title={student.student_lrn || ''}>{student.student_lrn || '—'}</td>
        <td className="px-2 py-1.5 text-xs font-medium text-slate-900 max-w-[180px] truncate" title={student.student_name || ''}>{student.student_name || 'Unknown'}</td>
        <td className="px-2 py-1.5 text-xs text-center">
          <span className={(student.student_sex || '').toLowerCase() === 'male' ? 'text-blue-600' : 'text-pink-600'}>
            {(student.student_sex || '').charAt(0).toUpperCase() || '—'}
          </span>
        </td>
        {weekdayDates.map(wd => {
          const rec = attendanceMap[wd.dateStr]?.[student.student];
          return (
            <td key={wd.dateStr} className="px-1 py-1.5 text-center text-xs">
              {statusCell(rec?.status)}
            </td>
          );
        })}
        <td className="px-2 py-1.5 text-center text-xs font-semibold text-green-700">{st.prs}</td>
        <td className="px-2 py-1.5 text-center text-xs font-semibold text-red-700">{st.abs}</td>
        <td className="px-2 py-1.5 text-center text-xs font-semibold text-amber-700">{st.late}</td>
        <td className="px-2 py-1.5 text-center text-xs font-semibold text-blue-700">{st.exc}</td>
        <td className="px-2 py-1.5 text-center text-xs font-bold text-slate-700">{st.pct}%</td>
      </tr>
    );
  };

  const totalsRow = (totals, label, isGrand) => (
    <tr className={isGrand ? 'bg-indigo-100 font-bold' : 'bg-slate-100 font-semibold'}>
      <td colSpan={4} className={`px-3 py-2 text-xs ${isGrand ? 'text-indigo-800' : 'text-slate-700'}`}>{label}</td>
      <td className="px-2 py-2 text-center text-xs text-green-800">{totals.prs}</td>
      <td className="px-2 py-2 text-center text-xs text-red-800">{totals.abs}</td>
      <td className="px-2 py-2 text-center text-xs text-amber-800">{totals.late}</td>
      <td className="px-2 py-2 text-center text-xs text-blue-800">{totals.exc}</td>
      <td className="px-2 py-2 text-center text-xs text-slate-800">{totals.pct}%</td>
    </tr>
  );

  const renderTable = (studentList, sectionLabel, totals, isGrand) => {
    if (studentList.length === 0) return null;
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-200">
              <th className="px-2 py-2 text-center text-[10px] font-bold text-slate-600 uppercase border border-slate-300 w-8">#</th>
              <th className="px-2 py-2 text-center text-[10px] font-bold text-slate-600 uppercase border border-slate-300 w-20">LRN</th>
              <th className="px-2 py-2 text-left text-[10px] font-bold text-slate-600 uppercase border border-slate-300">Name of Learner</th>
              <th className="px-2 py-2 text-center text-[10px] font-bold text-slate-600 uppercase border border-slate-300 w-8">Sex</th>
              {weekdayDates.map(wd => (
                <th key={wd.dateStr} className="px-1 py-2 text-center border border-slate-300 min-w-[32px]">
                  <div className="text-[10px] font-bold text-slate-600">{wd.dayAbbr}</div>
                  <div className="text-[10px] text-slate-500">{wd.dayNum}</div>
                </th>
              ))}
              <th className="px-2 py-2 text-center text-[10px] font-bold text-slate-600 uppercase border border-slate-300 w-10">Prs</th>
              <th className="px-2 py-2 text-center text-[10px] font-bold text-slate-600 uppercase border border-slate-300 w-10">Abs</th>
              <th className="px-2 py-2 text-center text-[10px] font-bold text-slate-600 uppercase border border-slate-300 w-10">Late</th>
              <th className="px-2 py-2 text-center text-[10px] font-bold text-slate-600 uppercase border border-slate-300 w-10">Exc</th>
              <th className="px-2 py-2 text-center text-[10px] font-bold text-slate-600 uppercase border border-slate-300 w-10">%</th>
            </tr>
          </thead>
          <tbody>
            {headerRow(studentList, sectionLabel, isGrand)}
            {studentList.map((s, i) => studentRow(s, i))}
            {totalsRow(totals, `${sectionLabel} Total`, isGrand)}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm font-bold text-slate-900 min-w-[160px] text-center">
            {monthNames[selectedMonth - 1]} {selectedYear}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick month select */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-300 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {monthNames.map((name, i) => {
              const disabled = selectedYear === todayDate.year && (i + 1) > todayDate.month;
              return <option key={i} value={i + 1} disabled={disabled}>{name}</option>;
            })}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-300 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {Array.from({ length: 5 }, (_, i) => todayDate.year - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name or LRN..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Attendance Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><Skeleton.Table rows={5} cols={8} /></div>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="No Students"
              description={searchQuery ? "No students match your search" : "No students enrolled"}
              icon={<Users className="w-8 h-8" />}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* School info header */}
          <div className="bg-slate-800 text-white px-4 py-3 text-center">
            <p className="text-sm font-bold tracking-wide">{classroom.school_name || 'KNHS'}</p>
            <p className="text-[10px] text-slate-300 uppercase tracking-widest">School Attendance Log</p>
            <p className="text-xs font-semibold mt-1">{monthNames[selectedMonth - 1]} {selectedYear} — {classroom.name || classroom.section || 'Section'}</p>
          </div>

          {/* Male Section */}
          {maleStudents.length > 0 && (
            <div className="border-b border-slate-200">
              {renderTable(maleStudents, 'Male', maleTotals, false)}
            </div>
          )}

          {/* Female Section */}
          {femaleStudents.length > 0 && (
            <div>
              {renderTable(femaleStudents, 'Female', femaleTotals, false)}
            </div>
          )}

          {/* Grand Total */}
          {(maleStudents.length > 0 || femaleStudents.length > 0) && (
            <div className="bg-indigo-50 border-t-2 border-indigo-200">
              <table className="w-full text-xs">
                <tbody>
                  {totalsRow(grandTotals, 'Grand Total', true)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Analytics View - Custom inline implementation
export const AnalyticsView = ({ classroom, onBack }) => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get(`/classroom-subjects/by_classroom/?classroom_id=${classroom.id}`);
        setSubjects(res.data);
        if (res.data.length > 0) {
          setSelectedSubject(res.data[0].subject.toString());
        }
      } catch {
        toast.error('Failed to load subjects');
      }
    };
    fetchSubjects();
  }, [classroom.id]);

  // Load analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!selectedSubject) return;
      setLoading(true);
      try {
        const res = await api.get(`/grades/?classroom=${classroom.id}&subject=${selectedSubject}&grade_type=final_grade`);
        
        const grades = res.data;
        const scores = grades.map(g => parseFloat(g.raw_score)).filter(s => !isNaN(s));
        
        if (scores.length > 0) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          const sorted = [...scores].sort((a, b) => a - b);
          const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
          
          const passing = scores.filter(s => s >= 75).length;
          const failing = scores.filter(s => s < 75).length;
          
          const distribution = {
            '90-100': scores.filter(s => s >= 90 && s <= 100).length,
            '85-89': scores.filter(s => s >= 85 && s < 90).length,
            '80-84': scores.filter(s => s >= 80 && s < 85).length,
            '75-79': scores.filter(s => s >= 75 && s < 80).length,
            'Below 75': scores.filter(s => s < 75).length,
          };

          setAnalytics({
            average: avg.toFixed(2),
            median: median.toFixed(2),
            highest: Math.max(...scores),
            lowest: Math.min(...scores),
            passing,
            failing,
            total: scores.length,
            distribution
          });
        } else {
          setAnalytics(null);
        }
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [classroom.id, selectedSubject]);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Overview
      </Button>

      <Card>
        <CardHeader divider>
          <CardTitle>Analytics - {classroom.name}</CardTitle>
        </CardHeader>
        <CardBody className="p-3 sm:p-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.subject}>
                  {s.subject_name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Skeleton.StatCard />
            </div>
          ) : !selectedSubject ? (
            <div className="text-center py-12">
              <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Select a subject to view analytics</p>
            </div>
          ) : !analytics ? (
            <EmptyState
              title="No Data"
              description="No grades available for analysis"
              icon={<BarChart2 className="w-8 h-8" />}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-violet-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-violet-600">{analytics.average}</div>
                  <div className="text-xs text-violet-700 uppercase font-semibold mt-1">Average</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{analytics.median}</div>
                  <div className="text-xs text-blue-700 uppercase font-semibold mt-1">Median</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{analytics.highest}</div>
                  <div className="text-xs text-green-700 uppercase font-semibold mt-1">Highest</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{analytics.lowest}</div>
                  <div className="text-xs text-red-700 uppercase font-semibold mt-1">Lowest</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-700">{analytics.total}</div>
                  <div className="text-xs text-slate-600 uppercase font-semibold mt-1">Total Students</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.passing} ({((analytics.passing / analytics.total) * 100).toFixed(1)}%)
                  </div>
                  <div className="text-xs text-green-700 uppercase font-semibold mt-1">Passing {'(≥75)'}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {analytics.failing} ({((analytics.failing / analytics.total) * 100).toFixed(1)}%)
                  </div>
                  <div className="text-xs text-red-700 uppercase font-semibold mt-1">Failing {'(<75)'}</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Grade Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.distribution).map(([range, count]) => {
                    const percentage = (count / analytics.total) * 100;
                    const colorClass = range === '90-100' ? 'bg-green-500' :
                                     range === '85-89' ? 'bg-blue-500' :
                                     range === '80-84' ? 'bg-violet-500' :
                                     range === '75-79' ? 'bg-amber-500' :
                                     'bg-red-500';
                    const labelInside = percentage >= 15; // only show text inside bar if wide enough
                    return (
                      <div key={range}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-semibold text-slate-700">{range}</span>
                          <span className="text-slate-500 text-xs">{count} student{count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="relative w-full bg-slate-200 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full ${colorClass} transition-all duration-500 flex items-center`}
                            style={{ width: `${Math.max(percentage, 0)}%` }}
                          >
                            {labelInside && (
                              <span className="pl-2 text-white text-xs font-bold select-none whitespace-nowrap">
                                {percentage.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {!labelInside && count > 0 && (
                            <span
                              className="absolute top-1/2 -translate-y-1/2 text-slate-700 text-xs font-bold select-none"
                              style={{ left: `calc(${percentage}% + 6px)` }}
                            >
                              {percentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
