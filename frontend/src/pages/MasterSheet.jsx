import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Download, Filter, ChevronDown, Printer, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, FileText, Eye, EyeOff,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import api from '../utils/api';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { Skeleton, Button } from '../components/ui';
import toast from 'react-hot-toast';

const PASSING_GRADE = 75;
const getRemark = (score) => {
  if (score === null || score === undefined) return '';
  if (score >= 90) return 'Outstanding';
  if (score >= 85) return 'Very Satisfactory';
  if (score >= 80) return 'Satisfactory';
  if (score >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet Expectations';
};
const getGradeColor = (score) => {
  if (score === null || score === undefined) return 'text-gray-400';
  if (score >= 90) return 'text-emerald-700';
  if (score >= 85) return 'text-blue-700';
  if (score >= 80) return 'text-green-700';
  if (score >= 75) return 'text-amber-700';
  return 'text-red-700';
};

export default function MasterSheet() {
  const { academicYear } = useActiveAcademicYear();
  const { periodValues } = useSystemSettings();
  const printRef = useRef(null);
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    academic_year: '',
    grade_level: '',
    classroom: searchParams.get('classroom') || '',
    subject: '',
    quarter: searchParams.get('quarter') || '1',
    teacher: '',
  });
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [printMode, setPrintMode] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (academicYear) setFilters(f => ({ ...f, academic_year: academicYear }));
    Promise.all([
      api.get('/classrooms/').catch(() => ({ data: [] })),
      api.get('/subjects/').catch(() => ({ data: [] })),
      api.get('/users/?role=staff').catch(() => ({ data: [] })),
    ]).then(([c, s, t]) => {
      setClassrooms(c.data);
      setSubjects(s.data);
      setTeachers(t.data);
    });
  }, [academicYear]);

  const filteredClassrooms = useMemo(() => {
    let list = classrooms;
    if (filters.grade_level) list = list.filter(c => String(c.grade_level) === String(filters.grade_level));
    if (filters.teacher) list = list.filter(c => String(c.teacher) === String(filters.teacher));
    return list;
  }, [classrooms, filters.grade_level, filters.teacher]);

  const fetchGrades = useCallback(async () => {
    if (!filters.classroom || !filters.quarter) return;
    setLoading(true);
    try {
      const res = await api.get('/grades/by_classroom/', {
        params: {
          classroom_id: filters.classroom,
          quarter: filters.quarter,
          academic_year: filters.academic_year || undefined,
        },
      });
      setGrades(res.data);
    } catch {
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, [filters.classroom, filters.quarter, filters.academic_year]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const { students, gradeColumns, gradeMatrix, classroomObj, teacherObj } = useMemo(() => {
    const stMap = {};
    const cols = new Set();
    const matrix = {};

    for (const g of grades) {
      if (!g.student_name) continue;
      const stId = g.student;
      if (!stMap[stId]) {
        stMap[stId] = {
          id: stId, name: g.student_name, lrn: g.student_lrn || '',
          sex: g.student_sex || '', email: g.student_email,
        };
      }
      const colKey = g.component ? `${g.subject}__${g.component}` : `${g.subject}__${g.grade_type}`;
      cols.add(colKey);
      if (!matrix[stId]) matrix[stId] = {};
      matrix[stId][colKey] = g.raw_score;
    }

    const sorted = Object.values(stMap).sort((a, b) => a.name.localeCompare(b.name));
    const sortedCols = [...cols].sort();
    const co = classrooms.find(c => c.id === parseInt(filters.classroom));
    const te = teachers.find(t => t.id === co?.teacher);

    return { students: sorted, gradeColumns: sortedCols, gradeMatrix: matrix, classroomObj: co, teacherObj: te };
  }, [grades, classrooms, teachers, filters.classroom]);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(q) || (s.lrn || '').includes(q));
  }, [students, search]);

  const stats = useMemo(() => {
    const scores = [];
    let missing = 0;
    let invalid = 0;
    let maleCount = 0;
    let femaleCount = 0;

    for (const st of students) {
      if (st.sex === 'male') maleCount++;
      else if (st.sex === 'female') femaleCount++;

      const stScores = [];
      for (const col of gradeColumns) {
        const val = gradeMatrix[st.id]?.[col];
        if (val === null || val === undefined) { missing++; continue; }
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 100) { invalid++; continue; }
        stScores.push(num);
      }
      if (stScores.length) {
        const avg = stScores.reduce((a, b) => a + b, 0) / stScores.length;
        scores.push(avg);
      }
    }

    const totalCells = students.length * gradeColumns.length;
    const filledCells = totalCells - missing;
    const completionPct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

    return {
      total: students.length,
      male: maleCount,
      female: femaleCount,
      highest: scores.length ? Math.max(...scores).toFixed(2) : '-',
      lowest: scores.length ? Math.min(...scores).toFixed(2) : '-',
      average: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '-',
      passingRate: scores.length ? ((scores.filter(s => s >= PASSING_GRADE).length / scores.length) * 100).toFixed(1) : '-',
      failingRate: scores.length ? ((scores.filter(s => s < PASSING_GRADE).length / scores.length) * 100).toFixed(1) : '-',
      completion: completionPct,
      missing,
      invalid,
    };
  }, [students, gradeColumns, gradeMatrix]);

  const validation = useMemo(() => {
    const issues = [];
    if (!filters.classroom) issues.push({ type: 'error', msg: 'No classroom selected' });
    if (!filters.quarter) issues.push({ type: 'error', msg: 'No quarter selected' });
    if (students.length === 0) issues.push({ type: 'error', msg: 'No students found in this classroom' });
    if (stats.missing > 0) issues.push({ type: 'warning', msg: `${stats.missing} missing grade entries` });
    if (stats.invalid > 0) issues.push({ type: 'error', msg: `${stats.invalid} invalid grade values` });
    if (stats.completion < 100) issues.push({ type: 'info', msg: `Grade completion: ${stats.completion}%` });
    const dupes = students.filter((s, i) => students.findIndex(x => x.id === s.id) !== i);
    if (dupes.length) issues.push({ type: 'error', msg: `${dupes.length} duplicate student entries` });
    return issues;
  }, [filters, students, stats]);

  const canExport = validation.filter(i => i.type === 'error').length === 0;

  const handlePrint = () => { setPrintMode(true); setTimeout(() => window.print(), 300); };
  useEffect(() => {
    const handleAfterPrint = () => setPrintMode(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleExportPDF = async () => {
    if (!canExport) { toast.error('Fix validation issues first'); return; }
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pw = 297, ph = 210, ml = 15, mr = 15, mt = 15;
    let y = mt;

    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('REPUBLIC OF THE PHILIPPINES', pw / 2, y, { align: 'center' }); y += 5;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Department of Education', pw / 2, y, { align: 'center' }); y += 4;
    doc.text('Region IV-A CALABARZON', pw / 2, y, { align: 'center' }); y += 4;
    doc.text('Division of Cavite', pw / 2, y, { align: 'center' }); y += 6;

    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('MASTER LIST OF LEARNERS', pw / 2, y, { align: 'center' }); y += 5;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`School Year: ${filters.academic_year || 'N/A'}`, pw / 2, y, { align: 'center' }); y += 8;

    const co = classroomObj;
    doc.setFontSize(9);
    doc.text(`Grade Level: ${co?.grade_level || 'N/A'}`, ml, y);
    doc.text(`Section: ${co?.name || 'N/A'}`, pw / 3, y);
    doc.text(`Teacher: ${teacherObj ? `${teacherObj.last_name || ''}, ${teacherObj.first_name || ''}` : 'N/A'}`, pw * 2 / 3, y);
    y += 5;
    doc.text(`Term: ${filters.quarter}`, ml, y);
    doc.text(`Total Students: ${students.length}`, pw / 3, y);
    y += 8;

    const cols = ['No.', 'LRN', 'Last Name', 'First Name', 'Middle Name', 'Sex'];
    const colWidths = [12, 30, 50, 50, 40, 15];
    const subjectCols = gradeColumns.filter(c => c.endsWith('__final_grade'));
    const subWidths = subjectCols.map(() => 22);
    const totalW = colWidths.reduce((a, b) => a + b, 0) + subWidths.reduce((a, b) => a + b, 0) + 25;

    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    let x = ml;
    cols.forEach((h, i) => { doc.text(h, x + 1, y); x += colWidths[i]; });
    subjectCols.forEach((c, i) => {
      const name = c.split('__')[0];
      const sub = subjects.find(s => String(s.id) === name);
      doc.text(sub?.code || sub?.name || name, x + 1, y); x += subWidths[i];
    });
    doc.text('Avg', x + 1, y); x += 25;
    y += 1;
    doc.line(ml, y, ml + totalW, y); y += 1;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    filteredStudents.forEach((st, idx) => {
      if (y > ph - 20) { doc.addPage(); y = mt; }
      const parts = (st.name || '').split(',').map(s => s.trim());
      const lastName = parts[0] || '';
      const firstMiddle = parts[1] || '';
      const fmParts = firstMiddle.split(' ').filter(Boolean);
      const firstName = fmParts[0] || '';
      const middleName = fmParts.slice(1).join(' ');
      let x = ml;
      const row = [String(idx + 1), st.lrn || '', lastName, firstName, middleName, st.sex === 'male' ? 'M' : st.sex === 'female' ? 'F' : ''];
      row.forEach((v, i) => { doc.text(String(v), x + 1, y); x += colWidths[i]; });
      const avgs = [];
      subjectCols.forEach((c, i) => {
        const val = gradeMatrix[st.id]?.[c];
        const display = val !== null && val !== undefined ? parseFloat(val).toFixed(1) : '-';
        doc.text(display, x + 1, y); x += subWidths[i];
        if (val !== null && val !== undefined) avgs.push(parseFloat(val));
      });
      const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : '-';
      doc.text(avg, x + 1, y);
      y += 4;
    });

    y += 5;
    doc.line(ml, y, ml + totalW, y); y += 5;
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Class Average: ${stats.average}`, ml, y);
    doc.text(`Highest: ${stats.highest}`, ml + 60, y);
    doc.text(`Lowest: ${stats.lowest}`, ml + 120, y);
    doc.text(`Passing Rate: ${stats.passingRate}%`, ml + 180, y);
    y += 10;
    doc.text('Prepared by: __________________________', ml, y);
    doc.text('Noted by: __________________________', ml + 120, y);

    doc.save(`MasterSheet-${co?.name || 'class'}-Q${filters.quarter}.pdf`);
    toast.success('PDF exported');
  };

  const handleExportExcel = async () => {
    if (!canExport) { toast.error('Fix validation issues first'); return; }
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const headers = ['No.', 'LRN', 'Last Name', 'First Name', 'Middle Name', 'Sex'];
    const subjectCols = gradeColumns.filter(c => c.endsWith('__final_grade'));
    subjectCols.forEach(c => {
      const sub = subjects.find(s => String(s.id) === c.split('__')[0]);
      headers.push(sub?.code || sub?.name || c);
    });
    headers.push('General Average', 'Remarks');

    const rows = filteredStudents.map((st, idx) => {
      const parts = (st.name || '').split(',').map(s => s.trim());
      const lastName = parts[0] || '';
      const firstMiddle = parts[1] || '';
      const fmParts = firstMiddle.split(' ').filter(Boolean);
      const firstName = fmParts[0] || '';
      const middleName = fmParts.slice(1).join(' ');
      const row = [idx + 1, st.lrn || '', lastName, firstName, middleName, st.sex === 'male' ? 'M' : st.sex === 'female' ? 'F' : ''];
      const avgs = [];
      subjectCols.forEach(c => {
        const val = gradeMatrix[st.id]?.[c];
        row.push(val !== null && val !== undefined ? parseFloat(val) : '');
        if (val !== null && val !== undefined) avgs.push(parseFloat(val));
      });
      const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2) : '';
      row.push(avg, avg ? getRemark(parseFloat(avg)) : '');
      return row;
    });

    const wsData = [
      ['Republic of the Philippines'],
      ['Department of Education'],
      ['Region IV-A CALABARZON - Division of Cavite'],
      ['MASTER LIST OF LEARNERS'],
      [`School Year: ${filters.academic_year || ''}`],
      [`Grade Level: ${classroomObj?.grade_level || ''}`, `Section: ${classroomObj?.name || ''}`, `Term: ${filters.quarter}`],
      [],
      headers,
      ...rows,
      [],
      ['Summary'],
      ['Total Students', students.length], ['Male', stats.male], ['Female', stats.female],
      ['Class Average', stats.average], ['Highest', stats.highest], ['Lowest', stats.lowest],
      ['Passing Rate', `${stats.passingRate}%`], ['Failing Rate', `${stats.failingRate}%`],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map((_, i) => ({ wch: i === 0 ? 5 : i === 1 ? 15 : i <= 4 ? 18 : i === 5 ? 5 : 12 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Master Sheet');
    XLSX.writeFile(wb, `MasterSheet-${classroomObj?.name || 'class'}-Q${filters.quarter}.xlsx`);
    toast.success('Excel exported');
  };

  const selectedSubject = filters.subject ? subjects.find(s => String(s.id) === String(filters.subject)) : null;

  if (printMode) {
    return (
      <div ref={printRef} className="bg-white p-8 min-h-screen">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold">REPUBLIC OF THE PHILIPPINES</h1>
          <p className="text-sm">Department of Education</p>
          <p className="text-sm">Region IV-A CALABARZON · Division of Cavite</p>
          <p className="text-base font-bold mt-2">MASTER LIST OF LEARNERS</p>
          <p className="text-sm">School Year: {filters.academic_year}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
          <div><strong>Grade Level:</strong> {classroomObj?.grade_level}</div>
          <div><strong>Section:</strong> {classroomObj?.name}</div>
          <div><strong>Teacher:</strong> {teacherObj ? `${teacherObj.last_name}, ${teacherObj.first_name}` : 'N/A'}</div>
          <div><strong>Term:</strong> {filters.quarter}</div>
          <div><strong>Total Students:</strong> {students.length}</div>
        </div>
        <PrintTable students={filteredStudents} gradeColumns={gradeColumns} gradeMatrix={gradeMatrix} subjects={subjects} stats={stats} />
        <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
          <div>Prepared by: __________________________</div>
          <div>Noted by: __________________________</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Master Sheet</h2>
          <p className="text-sm text-gray-500">DepEd-style master list auto-generated from recorded grades</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowValidation(true)}>
            <AlertTriangle className="w-4 h-4 mr-1.5" /> Validation
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!canExport}>
            <FileText className="w-4 h-4 mr-1.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!canExport}>
            <Download className="w-4 h-4 mr-1.5" /> Excel
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {filters.classroom && students.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Students', value: stats.total, color: 'text-gray-900' },
            { label: 'Male', value: stats.male, color: 'text-blue-600' },
            { label: 'Female', value: stats.female, color: 'text-pink-600' },
            { label: 'Average', value: stats.average, color: 'text-violet-600' },
            { label: 'Highest', value: stats.highest, color: 'text-emerald-600' },
            { label: 'Lowest', value: stats.lowest, color: 'text-red-600' },
            { label: 'Passing', value: `${stats.passingRate}%`, color: 'text-green-600' },
            { label: 'Failing', value: `${stats.failingRate}%`, color: 'text-red-600' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase">{card.label}</p>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Completion Bar */}
      {filters.classroom && (
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-gray-500 uppercase">Grade Completion</span>
            <span className="text-xs font-bold text-gray-700">{stats.completion}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${stats.completion === 100 ? 'bg-emerald-500' : stats.completion >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${stats.completion}%` }} />
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px] text-gray-400">
            <span>Missing: {stats.missing}</span>
            <span>Invalid: {stats.invalid}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Academic Year</label>
            <select value={filters.academic_year} onChange={e => setFilters(f => ({ ...f, academic_year: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">All</option>
              {['2024-2025', '2025-2026', '2026-2027'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Grade Level</label>
            <select value={filters.grade_level} onChange={e => setFilters(f => ({ ...f, grade_level: e.target.value, classroom: '' }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">All</option>
              {[7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Section</label>
            <select value={filters.classroom} onChange={e => setFilters(f => ({ ...f, classroom: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select section</option>
              {filteredClassrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Subject</label>
            <select value={filters.subject} onChange={e => setFilters(f => ({ ...f, subject: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">All</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Quarter</label>
            <select value={filters.quarter} onChange={e => setFilters(f => ({ ...f, quarter: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {periodValues.map(q => <option key={q} value={q}>Term {q}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Teacher</label>
            <select value={filters.teacher} onChange={e => setFilters(f => ({ ...f, teacher: e.target.value, classroom: '' }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">All</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.last_name}, {t.first_name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search student name or LRN..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm" />
          </div>
          <Button variant="outline" size="sm" onClick={fetchGrades}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : !filters.classroom ? (
        <EmptyState icon={<Filter className="w-10 h-10 text-gray-300" />} text="Select a section to view the master sheet" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState icon={<FileText className="w-10 h-10 text-gray-300" />} text="No students or grades found" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-2 py-2 text-left font-bold text-gray-700 sticky left-0 bg-gray-100 z-30 border-r border-gray-300 w-8">#</th>
                  <th className="px-2 py-2 text-left font-bold text-gray-700 sticky left-8 bg-gray-100 z-30 w-24 border-r border-gray-300">LRN</th>
                  <th className="px-2 py-2 text-left font-bold text-gray-700 sticky left-[8rem] bg-gray-100 z-30 min-w-[160px] border-r border-gray-300">Name</th>
                  <th className="px-2 py-2 text-center font-bold text-gray-700 w-8 border-r border-gray-300">Sex</th>
                  {gradeColumns.filter(c => c.endsWith('__final_grade')).map(col => {
                    const subId = col.split('__')[0];
                    const sub = subjects.find(s => String(s.id) === subId);
                    return (
                      <th key={col} className="px-1 py-2 text-center font-bold text-gray-700 min-w-[60px] border-r border-gray-200">
                        <div className="truncate max-w-[60px]" title={sub?.name}>{sub?.code || sub?.name || subId}</div>
                      </th>
                    );
                  })}
                  <th className="px-2 py-2 text-center font-bold text-violet-700 bg-violet-50 min-w-[60px] border-l-2 border-violet-300">Avg</th>
                  <th className="px-2 py-2 text-center font-bold text-gray-700 min-w-[80px]">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st, idx) => {
                  const finalCols = gradeColumns.filter(c => c.endsWith('__final_grade'));
                  const avgs = [];
                  finalCols.forEach(c => { const v = gradeMatrix[st.id]?.[c]; if (v !== null && v !== undefined) avgs.push(parseFloat(v)); });
                  const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
                  return (
                    <tr key={st.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-2 py-1.5 text-center sticky left-0 z-10 border-r border-gray-200" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>{idx + 1}</td>
                      <td className="px-2 py-1.5 font-mono text-[10px] sticky left-8 z-10 border-r border-gray-200" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>{st.lrn || '-'}</td>
                      <td className="px-2 py-1.5 font-medium sticky left-[8rem] z-10 border-r border-gray-200" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>{st.name}</td>
                      <td className="px-2 py-1.5 text-center border-r border-gray-300">{st.sex === 'male' ? 'M' : st.sex === 'female' ? 'F' : '-'}</td>
                      {finalCols.map(col => {
                        const val = gradeMatrix[st.id]?.[col];
                        return (
                          <td key={col} className="px-1 py-1.5 text-center border-r border-gray-200">
                            <span className={`font-semibold ${getGradeColor(val)}`}>
                              {val !== null && val !== undefined ? parseFloat(val).toFixed(1) : '-'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center font-bold border-l-2 border-violet-300 bg-violet-50/50">
                        <span className={getGradeColor(avg)}>{avg !== null ? avg.toFixed(1) : '-'}</span>
                      </td>
                      <td className="px-2 py-1.5 text-center text-[10px]">
                        {avg !== null ? getRemark(avg) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <td colSpan={4} className="px-2 py-2 text-right text-gray-600 sticky left-0 bg-gray-100 z-10">Summary:</td>
                  {gradeColumns.filter(c => c.endsWith('__final_grade')).map(col => {
                    const vals = filteredStudents.map(st => gradeMatrix[st.id]?.[col]).filter(v => v !== null && v !== undefined).map(Number);
                    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-';
                    return <td key={col} className="px-1 py-2 text-center border-r border-gray-200 text-violet-700">{avg}</td>;
                  })}
                  <td className="px-2 py-2 text-center text-violet-700 border-l-2 border-violet-300 bg-violet-100">{stats.average}</td>
                  <td className="px-2 py-2 text-center text-gray-600"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-400">
            <span>{filteredStudents.length} students · {gradeColumns.filter(c => c.endsWith('__final_grade')).length} subjects · {classroomObj?.name} · Term {filters.quarter}</span>
            <span>{filters.academic_year}</span>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowValidation(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Export Validation</h3>
              <button onClick={() => setShowValidation(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {validation.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg text-emerald-700 text-sm">
                  <CheckCircle2 className="w-5 h-5" /> All checks passed — ready to export
                </div>
              ) : validation.map((v, i) => (
                <div key={i} className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  v.type === 'error' ? 'bg-red-50 text-red-700' : v.type === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {v.type === 'error' ? <XCircle className="w-4 h-4 flex-shrink-0" /> : v.type === 'warning' ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                  {v.msg}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={() => setShowValidation(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 text-center gap-3">
      {icon}
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

function PrintTable({ students, gradeColumns, gradeMatrix, subjects, stats }) {
  const finalCols = gradeColumns.filter(c => c.endsWith('__final_grade'));
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-400 px-1 py-1 text-center w-8">#</th>
          <th className="border border-gray-400 px-1 py-1 text-center w-24">LRN</th>
          <th className="border border-gray-400 px-1 py-1 text-left">Last Name</th>
          <th className="border border-gray-400 px-1 py-1 text-left">First Name</th>
          <th className="border border-gray-400 px-1 py-1 text-left">Middle Name</th>
          <th className="border border-gray-400 px-1 py-1 text-center w-8">Sex</th>
          {finalCols.map(col => {
            const sub = subjects.find(s => String(s.id) === col.split('__')[0]);
            return <th key={col} className="border border-gray-400 px-1 py-1 text-center">{sub?.code || sub?.name}</th>;
          })}
          <th className="border border-gray-400 px-1 py-1 text-center bg-violet-50">Average</th>
          <th className="border border-gray-400 px-1 py-1 text-center">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {students.map((st, idx) => {
          const parts = (st.name || '').split(',').map(s => s.trim());
          const lastName = parts[0] || '';
          const fm = (parts[1] || '').split(' ').filter(Boolean);
          const firstName = fm[0] || '';
          const middleName = fm.slice(1).join(' ');
          const avgs = [];
          finalCols.forEach(c => { const v = gradeMatrix[st.id]?.[c]; if (v !== null && v !== undefined) avgs.push(parseFloat(v)); });
          const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
          return (
            <tr key={st.id} className={idx % 2 === 0 ? '' : 'bg-gray-50'}>
              <td className="border border-gray-400 px-1 py-1 text-center">{idx + 1}</td>
              <td className="border border-gray-400 px-1 py-1 font-mono text-[10px]">{st.lrn || ''}</td>
              <td className="border border-gray-400 px-1 py-1">{lastName}</td>
              <td className="border border-gray-400 px-1 py-1">{firstName}</td>
              <td className="border border-gray-400 px-1 py-1">{middleName}</td>
              <td className="border border-gray-400 px-1 py-1 text-center">{st.sex === 'male' ? 'M' : st.sex === 'female' ? 'F' : ''}</td>
              {finalCols.map(col => {
                const val = gradeMatrix[st.id]?.[col];
                return <td key={col} className="border border-gray-400 px-1 py-1 text-center">{val !== null && val !== undefined ? parseFloat(val).toFixed(1) : ''}</td>;
              })}
              <td className="border border-gray-400 px-1 py-1 text-center font-bold">{avg !== null ? avg.toFixed(1) : ''}</td>
              <td className="border border-gray-400 px-1 py-1 text-center">{avg !== null ? getRemark(avg) : ''}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
