import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Download, Loader2, BookOpen, ChevronLeft, ChevronRight,
  Search, Calendar, FileText, Users,
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SF2Dashboard() {
  const [classrooms, setClassrooms] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [formData, setFormData] = useState({
    academic_year: '',
    grade_level: '',
    section: '',
  });
  const todayDate = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(todayDate.month);
  const [selectedYear, setSelectedYear] = useState(todayDate.year);
  const [generating, setGenerating] = useState(false);

  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchClassrooms = async () => {
      setLoadingClasses(true);
      try {
        const res = await api.get('/classrooms/', { params: { page_size: 1000 } });
        setClassrooms(res.data.results || res.data);
      } catch {
        toast.error('Failed to load classrooms');
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClassrooms();
  }, []);

  const gradeLevels = [...new Set(classrooms.map(c => c.grade_level))].sort();
  const sections = classrooms
    .filter(c => !formData.grade_level || c.grade_level === formData.grade_level)
    .map(c => c.section)
    .sort();
  const schoolYears = [...new Set(classrooms.map(c => c.academic_year))].sort().reverse();

  const handleFieldChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'grade_level') next.section = '';
      return next;
    });
  };

  const canGenerate = formData.academic_year && formData.grade_level && formData.section;

  const fetchOverview = useCallback(async () => {
    if (!canGenerate) return;
    setOverviewLoading(true);
    try {
      const res = await api.get('/sf2/overview/', {
        params: {
          academic_year: formData.academic_year,
          grade_level: formData.grade_level,
          section: formData.section,
          month: selectedMonth,
          year: selectedYear,
        },
      });
      setOverviewData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load attendance data');
      setOverviewData(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [formData.academic_year, formData.grade_level, formData.section, selectedMonth, selectedYear, canGenerate]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const weekdayDates = useMemo(() => {
    const days = [];
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(selectedYear, selectedMonth - 1, d);
      const dow = date.getDay();
      if (dow >= 1 && dow <= 5) {
        const mm = String(selectedMonth).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        days.push({ dateStr: `${selectedYear}-${mm}-${dd}`, dayNum: d, dayAbbr: DAY_ABBR[dow], dow });
      }
    }
    return days;
  }, [selectedYear, selectedMonth]);

  const students = overviewData?.students || [];
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      (s.student_name || '').toLowerCase().includes(q) ||
      (s.lrn || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const maleStudents = useMemo(() => filteredStudents.filter(s => (s.sex || '').toLowerCase() === 'male'), [filteredStudents]);
  const femaleStudents = useMemo(() => filteredStudents.filter(s => (s.sex || '').toLowerCase() === 'female'), [filteredStudents]);

  const navMonth = (delta) => {
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    if (y > todayDate.year || (y === todayDate.year && m > todayDate.month)) return;
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const statusCell = (status) => {
    switch (status) {
      case 'P': return <span className="text-green-600 font-bold">P</span>;
      case 'A': return <span className="text-red-600 font-bold">A</span>;
      case 'L': return <span className="text-amber-600 font-bold">L</span>;
      case 'E': return <span className="text-blue-600 font-bold">E</span>;
      default: return <span className="text-slate-300">—</span>;
    }
  };

  const getStudentStats = useCallback((student) => {
    let prs = 0, abs = 0, late = 0, exc = 0;
    weekdayDates.forEach(wd => {
      const code = student.daily?.[String(wd.dayNum)] || '—';
      if (code === 'P') prs++;
      else if (code === 'A') abs++;
      else if (code === 'L') late++;
      else if (code === 'E') exc++;
    });
    const total = prs + abs + late + exc;
    const pct = total > 0 ? Math.round((prs / total) * 100) : 0;
    return { prs, abs, late, exc, pct };
  }, [weekdayDates]);

  const getSectionTotals = useCallback((studentList) => {
    let prs = 0, abs = 0, late = 0, exc = 0;
    studentList.forEach(s => {
      const st = getStudentStats(s);
      prs += st.prs; abs += st.abs; late += st.late; exc += st.exc;
    });
    const total = prs + abs + late + exc;
    const pct = total > 0 ? Math.round((prs / total) * 100) : 0;
    return { prs, abs, late, exc, pct };
  }, [getStudentStats]);

  const maleTotals = useMemo(() => getSectionTotals(maleStudents), [getSectionTotals, maleStudents]);
  const femaleTotals = useMemo(() => getSectionTotals(femaleStudents), [getSectionTotals, femaleStudents]);
  const grandTotals = useMemo(() => {
    const prs = maleTotals.prs + femaleTotals.prs;
    const abs = maleTotals.abs + femaleTotals.abs;
    const late = maleTotals.late + femaleTotals.late;
    const exc = maleTotals.exc + femaleTotals.exc;
    const total = prs + abs + late + exc;
    const pct = total > 0 ? Math.round((prs / total) * 100) : 0;
    return { prs, abs, late, exc, pct };
  }, [maleTotals, femaleTotals]);

  const handleExport = async (type) => {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const params = {
        academic_year: formData.academic_year,
        grade_level: formData.grade_level,
        section: formData.section,
        month: selectedMonth,
        year: selectedYear,
      };
      const endpoint = type === 'pdf' ? '/sf2/export_pdf/' : '/sf2/export_excel/';
      const res = await api.get(endpoint, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `SF2_${formData.academic_year}_${formData.grade_level}_${formData.section}_${MONTHS[selectedMonth - 1]}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} exported successfully`);
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to export ${type.toUpperCase()}`);
    } finally {
      setGenerating(false);
    }
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
    const st = getStudentStats(student);
    return (
      <tr key={student.student_id} className="hover:bg-slate-50 transition-colors">
        <td className="px-2 py-1.5 text-xs text-slate-500 text-center font-medium">{idx + 1}</td>
        <td className="px-2 py-1.5 text-xs text-slate-700 max-w-[120px] truncate" title={student.lrn || ''}>{student.lrn || '—'}</td>
        <td className="px-2 py-1.5 text-xs font-medium text-slate-900 max-w-[180px] truncate" title={student.student_name || ''}>{student.student_name || 'Unknown'}</td>
        <td className="px-2 py-1.5 text-xs text-center">
          <span className={(student.sex || '').toLowerCase() === 'male' ? 'text-blue-600' : 'text-pink-600'}>
            {(student.sex || '').charAt(0).toUpperCase() || '—'}
          </span>
        </td>
        {weekdayDates.map(wd => {
          const code = student.daily?.[String(wd.dayNum)] || '—';
          return (
            <td key={wd.dateStr} className="px-1 py-1.5 text-center text-xs">
              {statusCell(code)}
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span>School Forms</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          School Form 2 (SF2)
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-semibold">
          Daily Attendance Report of Learners
        </p>
      </div>

      {/* Selection Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Generate Attendance Report</h2>
        {loadingClasses ? (
          <div className="space-y-4">
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* School Year */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">School Year</label>
              <select
                value={formData.academic_year}
                onChange={(e) => handleFieldChange('academic_year', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Select School Year</option>
                {schoolYears.map(sy => <option key={sy} value={sy}>{sy}</option>)}
              </select>
            </div>

            {/* Grade Level */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Grade Level</label>
              <select
                value={formData.grade_level}
                onChange={(e) => handleFieldChange('grade_level', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Select Grade Level</option>
                {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Section</label>
              <select
                value={formData.section}
                onChange={(e) => handleFieldChange('section', e.target.value)}
                disabled={!formData.grade_level}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">Select Section</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Export Buttons */}
            <div className="flex items-end gap-2">
              <button
                onClick={() => handleExport('pdf')}
                disabled={!canGenerate || generating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                PDF
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={!canGenerate || generating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Excel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      {overviewLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-sm text-slate-500 font-medium">Loading attendance data...</p>
          </div>
        </div>
      ) : !overviewData ? (
        canGenerate ? null : (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <FileText className="w-12 h-12 text-slate-300" />
              <div>
                <p className="text-sm font-bold text-slate-700">Select Class to View Attendance</p>
                <p className="text-xs text-slate-500 mt-1">Choose a school year, grade level, and section above</p>
              </div>
            </div>
          </div>
        )
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <Users className="w-12 h-12 text-slate-300" />
            <div>
              <p className="text-sm font-bold text-slate-700">No Students Found</p>
              <p className="text-xs text-slate-500 mt-1">{searchQuery ? 'No students match your search' : 'No students enrolled in this class'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Month navigation + search bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="text-sm font-bold text-slate-900 min-w-[160px] text-center">
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </div>
              <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
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
          </div>

          {/* School info header */}
          <div className="bg-slate-800 text-white px-4 py-3 text-center">
            <p className="text-sm font-bold tracking-wide">{overviewData.school_name || 'KNHS'}</p>
            <p className="text-[10px] text-slate-300 uppercase tracking-widest">School Attendance Log</p>
            <p className="text-xs font-semibold mt-1">
              {MONTHS[selectedMonth - 1]} {selectedYear} — {formData.grade_level} {formData.section}
              {overviewData.adviser_name && <span className="text-slate-400 ml-2">Adviser: {overviewData.adviser_name}</span>}
            </p>
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

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-blue-800 mb-2">About SF2</h3>
        <p className="text-xs text-blue-700 leading-relaxed">
          School Form 2 (Daily Attendance Report of Learners) is generated on-the-fly from existing attendance records.
          Select a class section to view the monthly attendance grid. Navigate months with the arrows.
          Export as PDF or Excel for printing.
        </p>
      </div>
    </motion.div>
  );
}
