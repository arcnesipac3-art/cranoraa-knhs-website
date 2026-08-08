import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Download, Loader2, BookOpen, ChevronLeft, ChevronRight,
  Search, FileText, Users, Printer, TrendingUp, Calendar,
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_COLORS = {
  P: 'bg-green-100 text-green-700 font-black',
  A: 'bg-red-100 text-red-700 font-black',
  L: 'bg-amber-100 text-amber-700 font-black',
  E: 'bg-blue-100 text-blue-700 font-black',
};

export default function SF2Dashboard() {
  const [classrooms, setClassrooms] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [formData, setFormData] = useState({ academic_year: '', grade_level: '', section: '' });
  const todayDate = useMemo(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; }, []);
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

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

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

  const weekGroups = useMemo(() => {
    const groups = [];
    let currentWeek = [];
    weekdayDates.forEach(wd => {
      if (wd.dow === 1 && currentWeek.length > 0) { groups.push(currentWeek); currentWeek = []; }
      currentWeek.push(wd);
    });
    if (currentWeek.length > 0) groups.push(currentWeek);
    return groups;
  }, [weekdayDates]);

  const students = overviewData?.students || [];
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => (s.student_name || '').toLowerCase().includes(q) || (s.lrn || '').toLowerCase().includes(q));
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

  const getStudentStats = useCallback((student) => {
    let prs = 0, abs = 0, late = 0, exc = 0;
    weekdayDates.forEach(wd => {
      const code = student.daily?.[String(wd.dayNum)] || '—';
      if (code === 'P') prs++; else if (code === 'A') abs++; else if (code === 'L') late++; else if (code === 'E') exc++;
    });
    const total = prs + abs + late + exc;
    const pct = total > 0 ? Math.round((prs / total) * 100) : 0;
    return { prs, abs, late, exc, pct };
  }, [weekdayDates]);

  const getSectionTotals = useCallback((studentList) => {
    let prs = 0, abs = 0, late = 0, exc = 0;
    studentList.forEach(s => { const st = getStudentStats(s); prs += st.prs; abs += st.abs; late += st.late; exc += st.exc; });
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

  const handlePrint = () => window.print();

  const renderStudentRows = (list, startIdx) => list.map((student, i) => {
    const st = getStudentStats(student);
    return (
      <tr key={student.student_id} className="group hover:bg-slate-50/50">
        <td className="px-2 py-1.5 text-[10px] text-slate-500 text-center border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 w-8">{startIdx + i + 1}</td>
        <td className="px-2 py-1.5 text-[10px] text-slate-500 font-mono border-r border-slate-200 sticky left-8 bg-white group-hover:bg-slate-50/50 z-10 w-24">{student.lrn || '—'}</td>
        <td className="px-2 py-1.5 text-[10px] font-semibold text-slate-800 border-r border-slate-200 sticky left-[8rem] bg-white group-hover:bg-slate-50/50 z-10 min-w-[140px] whitespace-nowrap">{student.student_name || 'Unknown'}</td>
        <td className="px-2 py-1.5 text-[10px] text-slate-500 text-center border-r border-slate-200 sticky left-[calc(8rem+140px)] bg-white group-hover:bg-slate-50/50 z-10 w-8">{(student.sex || '').charAt(0).toUpperCase() || '—'}</td>
        {weekdayDates.map(wd => {
          const code = student.daily?.[String(wd.dayNum)] || '—';
          return (
            <td key={wd.dateStr} className="px-0.5 py-1 text-center border-r border-slate-100">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] ${STATUS_COLORS[code] || 'text-slate-300'}`}>
                {code !== '—' ? code : '—'}
              </span>
            </td>
          );
        })}
        <td className="px-2 py-1.5 text-[10px] font-bold text-green-700 text-center border-l border-slate-200 bg-green-50/50">{st.prs}</td>
        <td className="px-2 py-1.5 text-[10px] font-bold text-red-700 text-center border-l border-slate-200 bg-red-50/50">{st.abs}</td>
        <td className="px-2 py-1.5 text-[10px] font-bold text-amber-700 text-center border-l border-slate-200 bg-amber-50/50">{st.late}</td>
        <td className="px-2 py-1.5 text-[10px] font-bold text-blue-700 text-center border-l border-slate-200 bg-blue-50/50">{st.exc}</td>
        <td className="px-2 py-1.5 text-[10px] font-black text-slate-700 text-center border-l border-slate-200 bg-slate-50">{st.pct}%</td>
      </tr>
    );
  });

  const renderTotalsRow = (label, totals, count, isGrand = false) => (
    <tr className={isGrand ? 'bg-slate-100 font-black' : 'bg-slate-50'}>
      <td colSpan={4} className={`px-2 py-1.5 text-[10px] border-r border-slate-200 sticky left-0 ${isGrand ? 'bg-slate-100' : 'bg-slate-50'} z-10`}>
        <span className="font-bold text-slate-700 uppercase">{label}</span>
        <span className="text-slate-400 ml-1">({count})</span>
      </td>
      <td className="px-2 py-1.5 text-[10px] font-bold text-green-700 text-center border-l border-slate-200">{totals.prs}</td>
      <td className="px-2 py-1.5 text-[10px] font-bold text-red-700 text-center border-l border-slate-200">{totals.abs}</td>
      <td className="px-2 py-1.5 text-[10px] font-bold text-amber-700 text-center border-l border-slate-200">{totals.late}</td>
      <td className="px-2 py-1.5 text-[10px] font-bold text-blue-700 text-center border-l border-slate-200">{totals.exc}</td>
      <td className="px-2 py-1.5 text-[10px] font-black text-slate-700 text-center border-l border-slate-200">{totals.pct}%</td>
    </tr>
  );

  const tableMinWidth = 12 + 8 + 140 + 8 + (weekdayDates.length * 28) + 80;
  const colSpan = 4 + weekdayDates.length + 5;
  const monthName = MONTHS[selectedMonth - 1];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          .overflow-x-auto { overflow: visible !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="space-y-4 px-4 md:px-6 py-6">
        {/* Print-only header */}
        <div className="print-only text-center mb-4">
          <p className="text-[10px] text-slate-600">Republic of the Philippines</p>
          <p className="text-[10px] text-slate-600">Department of Education</p>
          <p className="text-sm font-black text-slate-900">{overviewData?.school_name || 'School Name'}</p>
          <p className="text-[10px] text-slate-600">
            School ID: {overviewData?.school_id || '—'} | {overviewData?.region || '—'} | {overviewData?.division || '—'}
          </p>
          <p className="text-xs font-bold text-slate-900 mt-2">SCHOOL FORM 2 (SF2) — Daily Attendance Report of Learners</p>
          <p className="text-[10px] text-slate-600">
            SY: {formData.academic_year} | Grade: {formData.grade_level} | Section: {formData.section} | Month: {monthName} {selectedYear} | Adviser: {overviewData?.adviser_name || '—'}
          </p>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
          <div>
            <h1 className="text-xl font-black text-slate-900">SF2 — Daily Attendance Report</h1>
            <p className="text-xs text-slate-500 mt-0.5">{monthName} {selectedYear} | {formData.grade_level} {formData.section}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors" title="Print">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={() => handleExport('pdf')} disabled={!canGenerate || generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50">
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} PDF
            </button>
            <button onClick={() => handleExport('excel')} disabled={!canGenerate || generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50">
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 p-4 bg-white border border-slate-200 rounded-xl no-print">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">School Year</label>
            <select value={formData.academic_year} onChange={e => handleFieldChange('academic_year', e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Select Year</option>
              {schoolYears.map(sy => <option key={sy} value={sy}>{sy}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Month</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500">
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grade Level</label>
            <select value={formData.grade_level} onChange={e => handleFieldChange('grade_level', e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">All</option>
              {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Section</label>
            <select value={formData.section} onChange={e => handleFieldChange('section', e.target.value)}
              disabled={!formData.grade_level}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50">
              <option value="">Select Section</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name or LRN..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[10px] text-slate-400">
              {weekdayDates.length} school day{weekdayDates.length !== 1 ? 's' : ''} | {filteredStudents.length} learner{filteredStudents.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Loading */}
        {overviewLoading && (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              <p className="text-sm text-slate-500 font-medium">Loading attendance data...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!overviewLoading && !overviewData && canGenerate && (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <FileText className="w-12 h-12 text-slate-300" />
              <div>
                <p className="text-sm font-bold text-slate-700">No Data Found</p>
                <p className="text-xs text-slate-500 mt-1">No attendance data for this class and month</p>
              </div>
            </div>
          </div>
        )}

        {!overviewLoading && !canGenerate && (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <FileText className="w-12 h-12 text-slate-300" />
              <div>
                <p className="text-sm font-bold text-slate-700">Select Class to View Attendance</p>
                <p className="text-xs text-slate-500 mt-1">Choose a school year, grade level, and section above</p>
              </div>
            </div>
          </div>
        )}

        {/* SF2 Grid */}
        {!overviewLoading && overviewData && filteredStudents.length > 0 && (
          <>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 no-print">
              <span className="font-bold">Legend:</span>
              {[
                ['P', 'Present', 'bg-green-100 text-green-700'],
                ['A', 'Absent', 'bg-red-100 text-red-700'],
                ['L', 'Late', 'bg-amber-100 text-amber-700'],
                ['E', 'Excused', 'bg-blue-100 text-blue-700'],
              ].map(([code, label, cls]) => (
                <span key={code} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${cls}`}>
                  <span className="font-black">{code}</span> = {label}
                </span>
              ))}
              <span className="text-slate-300">— = Not recorded</span>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: `${tableMinWidth}px` }}>
                  <thead className="bg-[#2D1B4D] text-white sticky top-0 z-20">
                    <tr>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-violet-700 sticky left-0 bg-[#2D1B4D] z-30 w-8">No.</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-violet-700 sticky left-8 bg-[#2D1B4D] z-30 w-24">LRN</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-left border-r border-violet-700 sticky left-[8rem] bg-[#2D1B4D] z-30 min-w-[140px]">Name of Learner</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-violet-700 sticky left-[calc(8rem+140px)] bg-[#2D1B4D] z-30 w-8">S</th>
                      {weekdayDates.map(wd => (
                        <th key={wd.dateStr} className="px-1 py-2 text-center border-r border-violet-700 w-7" title={`${wd.dayAbbr} ${wd.dayNum}`}>
                          <div className="text-[8px] text-violet-300 leading-none">{wd.dayAbbr}</div>
                          <div className="text-[10px] font-black leading-tight">{wd.dayNum}</div>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-l border-violet-700 bg-green-800 w-14">Prs</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-l border-violet-700 bg-red-800 w-14">Abs</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-l border-violet-700 bg-amber-800 w-14">Late</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-l border-violet-700 bg-blue-800 w-14">Exc</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-l border-violet-700 bg-slate-700 w-14">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {maleStudents.length > 0 && (
                      <>
                        <tr><td colSpan={colSpan} className="px-3 py-1 bg-blue-50 text-[9px] font-bold text-blue-700 uppercase tracking-widest border-b border-blue-100">Male ({maleStudents.length})</td></tr>
                        {renderStudentRows(maleStudents, 0)}
                      </>
                    )}
                    {femaleStudents.length > 0 && (
                      <>
                        <tr><td colSpan={colSpan} className="px-3 py-1 bg-pink-50 text-[9px] font-bold text-pink-700 uppercase tracking-widest border-b border-pink-100">Female ({femaleStudents.length})</td></tr>
                        {renderStudentRows(femaleStudents, maleStudents.length)}
                      </>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 sticky bottom-0 z-20">
                    {maleStudents.length > 0 && renderTotalsRow('Male Total', maleTotals, maleStudents.length)}
                    {femaleStudents.length > 0 && renderTotalsRow('Female Total', femaleTotals, femaleStudents.length)}
                    {renderTotalsRow('Grand Total', grandTotals, filteredStudents.length, true)}
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Print-only footer */}
            <div className="print-only mt-8 text-[10px] text-slate-600">
              <div className="flex justify-between mt-8">
                <div className="text-center">
                  <div className="border-t border-slate-400 w-40 mt-10 pt-1">Prepared by:</div>
                  <div className="font-bold">{overviewData.adviser_name || 'Adviser Name'}</div>
                  <div>Adviser</div>
                </div>
                <div className="text-center">
                  <div className="border-t border-slate-400 w-40 mt-10 pt-1">Noted by:</div>
                  <div className="font-bold">{overviewData.school_name || 'School'} Head</div>
                  <div>School Head</div>
                </div>
              </div>
              <p className="text-center mt-6 text-[8px] text-slate-400">Generated: {new Date().toLocaleString()}</p>
            </div>
          </>
        )}

        {/* No students after search */}
        {!overviewLoading && overviewData && filteredStudents.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <Users className="w-12 h-12 text-slate-300" />
              <div>
                <p className="text-sm font-bold text-slate-700">No Students Found</p>
                <p className="text-xs text-slate-500 mt-1">{searchQuery ? 'No students match your search' : 'No students enrolled in this class'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
