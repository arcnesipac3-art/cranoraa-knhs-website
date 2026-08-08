import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Skeleton, EmptyState } from '../components/ui';
import { useAcademicYear } from '../context/AcademicYearContext';
import {
  Download, FileText, Printer,
  CheckCircle, XCircle, Clock, ShieldCheck, X, Loader2, AlertTriangle
} from 'lucide-react';
import {
  ExportProgress,
  downloadFromAPI,
  generateExportFilename,
  handleExportError,
} from '../utils/exportHelpers';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'];
const STATUS_DISPLAY = { present: 'P', absent: 'A', late: 'L', excused: 'E', school_activity: 'SA', medical_leave: 'ML' };
const STATUS_COLORS = {
  present: 'bg-green-100 text-green-700 hover:bg-green-200',
  absent: 'bg-red-100 text-red-700 hover:bg-red-200',
  late: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
  excused: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  school_activity: 'bg-violet-100 text-violet-700',
  medical_leave: 'bg-pink-100 text-pink-700',
};
const STATUS_ICONS = {
  present: CheckCircle, absent: XCircle, late: Clock, excused: ShieldCheck,
};
const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthDateRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start_date: start, end_date: end };
}

function getSchoolDays(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let d = 1; d <= lastDay; d++) {
    const dt = new Date(year, month - 1, d);
    if (dt.getDay() < 5 && dt <= today) {
      days.push({ day: d, date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`, dayName: DAY_NAMES[dt.getDay()] });
    }
  }
  return days;
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-300 text-[10px] font-bold">&mdash;</span>;
  const display = STATUS_DISPLAY[status] || status.charAt(0).toUpperCase();
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-black ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-500'}`}>
      {display}
    </span>
  );
}

function StatusPopup({ status, onSelect, onClose, anchorRef }) {
  const popupRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const onCloseRef = useRef(onClose);
  onSelectRef.current = onSelect;
  onCloseRef.current = onClose;

  useEffect(() => {
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onCloseRef.current();
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
      const map = { p: 'present', a: 'absent', l: 'late', e: 'excused' };
      if (map[e.key.toLowerCase()]) { onSelectRef.current(map[e.key.toLowerCase()]); onCloseRef.current(); }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [anchorRef]);

  return (
    <div ref={popupRef} className="absolute z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2" style={{ top: '100%', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="flex gap-1">
        {STATUS_OPTIONS.map(s => {
          const Icon = STATUS_ICONS[s];
          const active = status === s;
          return (
            <button key={s} onClick={() => { onSelect(s); onClose(); }}
              title={s.charAt(0).toUpperCase() + s.slice(1)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${active ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-violet-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
        <button onClick={() => { onSelect(null); onClose(); }} title="Clear"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const AttendanceDashboard = () => {
  const navigate = useNavigate();
  const { academicYears } = useAcademicYear();
  const now = new Date();
  const [filters, setFilters] = useState({
    academic_year: '', grade_level: '', section: '', month: now.getMonth() + 1, year: now.getFullYear(),
  });
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [sf2Data, setSf2Data] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [savingCells, setSavingCells] = useState(new Set());
  const [lastSaved, setLastSaved] = useState(null);
  const [exporting, setExporting] = useState(null);
  const cellRefs = useRef({});
  const saveTimers = useRef({});

  useEffect(() => {
    api.get('/system/settings/').then(r => setSchoolSettings(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (academicYears?.length > 0 && !filters.academic_year) {
      const active = academicYears.find(y => y.is_active) || academicYears[0];
      if (active) setFilters(f => ({ ...f, academic_year: String(active.id) }));
    }
  }, [academicYears, filters.academic_year]);

  useEffect(() => {
    const params = {};
    if (filters.academic_year) params.academic_year = filters.academic_year;
    api.get('/classrooms/', { params }).then(r => {
      const results = r.data?.results || (Array.isArray(r.data) ? r.data : []);
      setClassrooms(results);
    }).catch(() => {});
  }, [filters.academic_year]);

  const gradeLevels = useMemo(() => [...new Set(classrooms.map(c => c.grade_level).filter(Boolean))].sort(), [classrooms]);
  const sections = useMemo(() =>
    classrooms.filter(c => !filters.grade_level || c.grade_level === filters.grade_level).map(c => c.name).filter(Boolean).sort(),
    [classrooms, filters.grade_level]
  );
  const selectedClassroom = useMemo(() =>
    classrooms.find(c => c.name === filters.section && (!filters.grade_level || c.grade_level === filters.grade_level)),
    [classrooms, filters.section, filters.grade_level]
  );

  const schoolDays = useMemo(() => {
    if (!filters.month || !filters.year) return [];
    return getSchoolDays(filters.year, filters.month);
  }, [filters.month, filters.year]);

  const fetchSf2 = useCallback(async () => {
    if (!filters.academic_year || !filters.grade_level || !filters.section || !filters.month || !filters.year) {
      setSf2Data(null);
      return;
    }
    setLoading(true);
    try {
      const { start_date, end_date } = getMonthDateRange(filters.year, filters.month);
      const params = { academic_year: filters.academic_year, grade_level: filters.grade_level, section: filters.section, start_date, end_date };
      const res = await api.get('/sf2/', { params });
      setSf2Data(res.data);
    } catch {
      toast.error('Failed to load SF2 data');
      setSf2Data(null);
    } finally {
      setLoading(false);
    }
  }, [filters.academic_year, filters.grade_level, filters.section, filters.month, filters.year]);

  useEffect(() => { fetchSf2(); }, [fetchSf2]);

  const updateCell = useCallback((studentId, date, status) => {
    if (!selectedClassroom) { toast.error('No classroom selected'); return; }
    const cellKey = `${studentId}-${date}`;
    setSavingCells(prev => new Set([...prev, cellKey]));
    setSf2Data(prev => {
      if (!prev) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      const student = newData.data?.matrix?.students?.find(s => s.id === studentId);
      if (student) {
        const day = student.daily_attendance.find(d => d.date === date);
        if (day) day.status = status;
      }
      return newData;
    });
    if (saveTimers.current[cellKey]) clearTimeout(saveTimers.current[cellKey]);
    saveTimers.current[cellKey] = setTimeout(async () => {
      try {
        await api.post('/attendance/', { student: studentId, classroom: selectedClassroom.id, date, status });
        setLastSaved(new Date());
      } catch {
        toast.error('Failed to save attendance');
        fetchSf2();
      } finally {
        setSavingCells(prev => { const n = new Set(prev); n.delete(cellKey); return n; });
      }
    }, 500);
  }, [selectedClassroom, fetchSf2]);

  const matrix = sf2Data?.data?.matrix;
  const summary = sf2Data?.data?.summary;
  const students = matrix?.students || [];

  const dailyTotals = useMemo(() => {
    const totals = {};
    schoolDays.forEach(sd => { totals[sd.date] = { present: 0, absent: 0, late: 0, excused: 0 }; });
    students.forEach(s => {
      s.daily_attendance?.forEach(da => {
        if (da.status && totals[da.date]) {
          if (totals[da.date][da.status] !== undefined) totals[da.date][da.status]++;
        }
      });
    });
    return totals;
  }, [students, schoolDays]);

  const studentSummaries = useMemo(() => {
    return students.map(s => {
      let present = 0, absent = 0, late = 0, excused = 0;
      s.daily_attendance?.forEach(da => {
        if (da.status === 'present') present++;
        else if (da.status === 'absent') absent++;
        else if (da.status === 'late') late++;
        else if (da.status === 'excused') excused++;
      });
      const total = present + absent + late + excused;
      const pct = schoolDays.length > 0 ? Math.round(((present + late) / schoolDays.length) * 100) : 0;
      return { ...s, days_present: present, days_absent: absent, days_late: late, days_excused: excused, pct };
    });
  }, [students, schoolDays]);

  const grandTotals = useMemo(() => {
    let tp = 0, ta = 0, tl = 0, te = 0;
    studentSummaries.forEach(s => { tp += s.days_present; ta += s.days_absent; tl += s.days_late; te += s.days_excused; });
    const total = tp + ta + tl + te;
    const pct = total > 0 ? Math.round(((tp + tl) / total) * 100) : 0;
    return { present: tp, absent: ta, late: tl, excused: te, pct };
  }, [studentSummaries]);

  const maleStudents = useMemo(() => studentSummaries.filter(s => (s.sex || '').toLowerCase() === 'male'), [studentSummaries]);
  const femaleStudents = useMemo(() => studentSummaries.filter(s => (s.sex || '').toLowerCase() === 'female'), [studentSummaries]);

  const handleExportPDF = async () => {
    // Validation
    if (!filters.academic_year || !filters.grade_level || !filters.section) {
      toast.error('Please select academic year, grade level, and section first');
      return;
    }
    
    if (!students || students.length === 0) {
      toast.error('No students found for the selected classroom');
      return;
    }
    
    if (!filters.month || !filters.year) {
      toast.error('Please select month and year');
      return;
    }

    const progress = new ExportProgress(2, 'Preparing SF2 Attendance PDF');
    
    try {
      progress.update(1, 'Generating SF2 from server');
      
      const { start_date, end_date } = getMonthDateRange(filters.year, filters.month);
      const params = {
        academic_year: filters.academic_year,
        grade_level: filters.grade_level,
        section: filters.section,
        start_date,
        end_date,
      };
      
      const monthName = MONTHS.find(m => m.value === filters.month)?.label || filters.month;
      const filename = generateExportFilename(
        `SF2_${filters.grade_level}_${filters.section}_${monthName}_${filters.year}`,
        'pdf',
        { includeDate: false }
      );
      
      await downloadFromAPI(
        api,
        '/sf2/export/pdf/',
        filename,
        {
          method: 'post',
          params,
          responseType: 'blob',
        }
      );
      
      progress.complete('SF2 Attendance Report PDF exported successfully!');
      
    } catch (error) {
      handleExportError(error, 'PDF Export');
    }
  };

  const handleExportExcel = async () => {
    // Validation
    if (!filters.academic_year || !filters.grade_level || !filters.section) {
      toast.error('Please select academic year, grade level, and section first');
      return;
    }
    
    if (!students || students.length === 0) {
      toast.error('No students found for the selected classroom');
      return;
    }
    
    if (!filters.month || !filters.year) {
      toast.error('Please select month and year');
      return;
    }

    const progress = new ExportProgress(2, 'Preparing SF2 Attendance Excel');
    
    try {
      progress.update(1, 'Generating SF2 from server');
      
      const { start_date, end_date } = getMonthDateRange(filters.year, filters.month);
      const params = {
        academic_year: filters.academic_year,
        grade_level: filters.grade_level,
        section: filters.section,
        start_date,
        end_date,
      };
      
      const monthName = MONTHS.find(m => m.value === filters.month)?.label || filters.month;
      const filename = generateExportFilename(
        `SF2_${filters.grade_level}_${filters.section}_${monthName}_${filters.year}`,
        'xlsx',
        { includeDate: false }
      );
      
      await downloadFromAPI(
        api,
        '/sf2/export/excel/',
        filename,
        {
          method: 'post',
          params,
          responseType: 'blob',
        }
      );
      
      progress.complete('SF2 Attendance Report Excel exported successfully!');
      
    } catch (error) {
      handleExportError(error, 'Excel Export');
    }
  };

  const handlePrint = () => window.print();

  const monthName = MONTHS.find(m => m.value === filters.month)?.label || '';

  const renderStudentRows = (list, startIdx) => list.map((s, i) => (
    <tr key={s.id} className="group hover:bg-slate-50/50">
      <td className="px-2 py-1.5 text-[10px] text-slate-500 text-center border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 w-8">{startIdx + i + 1}</td>
      <td className="px-2 py-1.5 text-[10px] text-slate-500 font-mono border-r border-slate-200 sticky left-8 bg-white group-hover:bg-slate-50/50 z-10 w-24">{s.lrn || '—'}</td>
      <td className="px-2 py-1.5 text-[10px] font-semibold text-slate-800 border-r border-slate-200 sticky left-[8rem] bg-white group-hover:bg-slate-50/50 z-10 min-w-[140px] whitespace-nowrap">{s.name}</td>
      <td className="px-2 py-1.5 text-[10px] text-slate-500 text-center border-r border-slate-200 sticky left-[calc(8rem+140px)] bg-white group-hover:bg-slate-50/50 z-10 w-8">{s.sex?.charAt(0) || '—'}</td>
      {schoolDays.map(sd => {
        const att = s.daily_attendance?.find(a => a.date === sd.date);
        const cellKey = `${s.id}-${sd.date}`;
        const isSaving = savingCells.has(cellKey);
        return (
          <td key={sd.date} className="px-0.5 py-1 text-center border-r border-slate-100 relative">
            <div ref={el => { cellRefs.current[cellKey] = el; }} className="relative inline-flex items-center justify-center">
              <button onClick={() => setEditingCell(editingCell?.studentId === s.id && editingCell?.date === sd.date ? null : { studentId: s.id, date: sd.date, status: att?.status })}
                className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-black transition-all cursor-pointer ${att?.status ? STATUS_COLORS[att.status] : 'bg-slate-50 text-slate-300 hover:bg-slate-100'} ${isSaving ? 'opacity-50' : ''}`}
                title={`${s.name} — ${sd.dayName} ${sd.day}: ${att?.status || 'Not recorded'}`}>
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <StatusBadge status={att?.status} />}
              </button>
              {editingCell?.studentId === s.id && editingCell?.date === sd.date && (
                <StatusPopup status={att?.status} anchorRef={{ current: cellRefs.current[cellKey] }}
                  onSelect={(newStatus) => updateCell(s.id, sd.date, newStatus)}
                  onClose={() => setEditingCell(null)} />
              )}
            </div>
          </td>
        );
      })}
      <td className="px-2 py-1.5 text-[10px] font-bold text-green-700 text-center border-l border-slate-200 bg-green-50/50">{s.days_present}</td>
      <td className="px-2 py-1.5 text-[10px] font-bold text-red-700 text-center border-l border-slate-200 bg-red-50/50">{s.days_absent}</td>
      <td className="px-2 py-1.5 text-[10px] font-bold text-amber-700 text-center border-l border-slate-200 bg-amber-50/50">{s.days_late}</td>
      <td className="px-2 py-1.5 text-[10px] font-bold text-blue-700 text-center border-l border-slate-200 bg-blue-50/50">{s.days_excused}</td>
      <td className="px-2 py-1.5 text-[10px] font-black text-slate-700 text-center border-l border-slate-200 bg-slate-50">{s.pct}%</td>
    </tr>
  ));

  const renderTotalsRow = (label, present, absent, late, excused, pct, isGrand = false) => (
    <tr className={isGrand ? 'bg-slate-100 font-black' : 'bg-slate-50'}>
      <td colSpan={4} className={`px-2 py-1.5 text-[10px] border-r border-slate-200 sticky left-0 ${isGrand ? 'bg-slate-100' : 'bg-slate-50'} z-10`}>
        <span className="font-bold text-slate-700 uppercase">{label}</span>
        <span className="text-slate-400 ml-1">({isGrand ? students.length : '—'})</span>
      </td>
      {schoolDays.map(sd => {
        const t = dailyTotals[sd.date] || {};
        const total = (t.present || 0) + (t.absent || 0) + (t.late || 0) + (t.excused || 0);
        return (
          <td key={sd.date} className="px-1 py-1.5 text-[9px] font-bold text-slate-600 text-center border-r border-slate-100">
            {total > 0 ? total : ''}
          </td>
        );
      })}
      <td className="px-2 py-1.5 text-[10px] font-bold text-green-700 text-center border-l border-slate-200">{present}</td>
      <td className="px-2 py-1.5 text-[10px] font-bold text-red-700 text-center border-l border-slate-200">{absent}</td>
      <td className="px-2 py-1.5 text-[10px] font-bold text-amber-700 text-center border-l border-slate-200">{late}</td>
      <td className="px-2 py-1.5 text-[10px] font-bold text-blue-700 text-center border-l border-slate-200">{excused}</td>
      <td className="px-2 py-1.5 text-[10px] font-black text-slate-700 text-center border-l border-slate-200">{pct}%</td>
    </tr>
  );

  const isFilterReady = filters.academic_year && filters.grade_level && filters.section;

  return (
    <div className="space-y-4 px-4 md:px-6 py-6">
      {/* Print-only header */}
      <div className="hidden print:block text-center mb-4">
        <p className="text-[10px] text-slate-600">Republic of the Philippines</p>
        <p className="text-[10px] text-slate-600">Department of Education</p>
        <p className="text-sm font-black text-slate-900">{schoolSettings?.site_name || 'School Name'}</p>
        <p className="text-[10px] text-slate-600">School ID: {schoolSettings?.school_id || '—'} | {schoolSettings?.region || '—'} | {schoolSettings?.division || '—'}</p>
        <p className="text-xs font-bold text-slate-900 mt-2">SCHOOL FORM 2 (SF2) — Daily Attendance Report of Learners</p>
        <p className="text-[10px] text-slate-600">SY: {filters.academic_year} | Grade: {filters.grade_level} | Section: {filters.section} | Month: {monthName} {filters.year} | Adviser: {selectedClassroom?.teacher_name || '—'}</p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl font-black text-slate-900">SF2 — Daily Attendance Report</h1>
          <p className="text-xs text-slate-500 mt-0.5">{monthName} {filters.year} | {filters.grade_level} {filters.section}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && <span className="text-[10px] text-green-600 font-semibold">Saved {lastSaved.toLocaleTimeString()}</span>}
          <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors" title="Print"><Printer className="w-4 h-4" /></button>
          <button onClick={handleExportPDF} disabled={exporting === 'pdf'} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50">
            {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} PDF
          </button>
          <button onClick={handleExportExcel} disabled={exporting === 'excel'} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50">
            {exporting === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-white border border-slate-200 rounded-xl no-print">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Year</label>
          <select value={filters.academic_year} onChange={e => setFilters(f => ({ ...f, academic_year: e.target.value, grade_level: '', section: '' }))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="">Select Year</option>
            {academicYears.map(y => <option key={y.id} value={String(y.id)}>{y.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Month</label>
          <select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: parseInt(e.target.value) }))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500">
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grade Level</label>
          <select value={filters.grade_level} onChange={e => setFilters(f => ({ ...f, grade_level: e.target.value, section: '' }))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="">All</option>
            {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Section</label>
          <select value={filters.section} onChange={e => setFilters(f => ({ ...f, section: e.target.value }))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="">Select Section</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] text-slate-400">
            {schoolDays.length} school day{schoolDays.length !== 1 ? 's' : ''} | {students.length} learner{students.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Classroom quick links */}
      {!loading && classrooms.length > 0 && (
        <div className="no-print">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider">Your Classes — View Attendance History</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {classrooms.map(cls => (
              <button
                key={cls.id}
                onClick={() => navigate(`/my-classes?classroom=${cls.id}&view=attendance-history`)}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2.5 hover:border-violet-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0">
                  {cls.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-900 truncate">{cls.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                    {cls.grade_level || 'Grade'}{cls.teacher_name ? ` · ${cls.teacher_name}` : ''}
                  </p>
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          <Skeleton.PageHeader />
          <Skeleton.Table rows={8} cols={6} />
        </div>
      )}

      {/* No filter selected */}
      {!loading && !isFilterReady && (
        <EmptyState title="Select Filters" description="Choose academic year, grade level, and section to view the SF2 attendance report." icon={<AlertTriangle className="w-8 h-8" />} />
      )}

      {/* SF2 Grid */}
      {!loading && isFilterReady && students.length === 0 && (
        <EmptyState title="No Students Found" description="No enrolled students found for the selected filters." icon={<AlertTriangle className="w-8 h-8" />} />
      )}

      {!loading && isFilterReady && students.length > 0 && (
        <>
          {/* SF2 Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center hidden print:block">
            <p className="text-[10px] text-slate-600">Region: {schoolSettings?.region || '—'} | Division: {schoolSettings?.division || '—'}</p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 no-print">
            <span className="font-bold">Legend:</span>
            {Object.entries(STATUS_DISPLAY).filter(([k]) => ['present', 'absent', 'late', 'excused'].includes(k)).map(([k, v]) => (
              <span key={k} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${STATUS_COLORS[k]}`}>
                <span className="font-black">{v}</span> = {k.charAt(0).toUpperCase() + k.slice(1)}
              </span>
            ))}
            <span className="text-slate-300">&mdash; = Not recorded</span>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: `${12 + 8 + 140 + 8 + (schoolDays.length * 28) + 80}px` }}>
                <thead className="bg-[#2D1B4D] text-white sticky top-0 z-20">
                  <tr>
                    <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-violet-700 sticky left-0 bg-[#2D1B4D] z-30 w-8">No.</th>
                    <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-violet-700 sticky left-8 bg-[#2D1B4D] z-30 w-24">LRN</th>
                    <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-left border-r border-violet-700 sticky left-[8rem] bg-[#2D1B4D] z-30 min-w-[140px]">Name of Learner</th>
                    <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-violet-700 sticky left-[calc(8rem+140px)] bg-[#2D1B4D] z-30 w-8">S</th>
                    {schoolDays.map(sd => (
                      <th key={sd.date} className="px-1 py-2 text-center border-r border-violet-700 w-7" title={`${sd.dayName} ${sd.day}`}>
                        <div className="text-[8px] text-violet-300 leading-none">{sd.dayName}</div>
                        <div className="text-[10px] font-black leading-tight">{sd.day}</div>
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
                      <tr><td colSpan={4 + schoolDays.length + 5} className="px-3 py-1 bg-blue-50 text-[9px] font-bold text-blue-700 uppercase tracking-widest border-b border-blue-100">Male ({maleStudents.length})</td></tr>
                      {renderStudentRows(maleStudents, 0)}
                    </>
                  )}
                  {femaleStudents.length > 0 && (
                    <>
                      <tr><td colSpan={4 + schoolDays.length + 5} className="px-3 py-1 bg-pink-50 text-[9px] font-bold text-pink-700 uppercase tracking-widest border-b border-pink-100">Female ({femaleStudents.length})</td></tr>
                      {renderStudentRows(femaleStudents, maleStudents.length)}
                    </>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 sticky bottom-0 z-20">
                  {maleStudents.length > 0 && (() => {
                    let mp = 0, ma = 0, ml = 0, me = 0;
                    maleStudents.forEach(s => { mp += s.days_present; ma += s.days_absent; ml += s.days_late; me += s.days_excused; });
                    const mt = mp + ma + ml + me;
                    const mpct = mt > 0 ? Math.round(((mp + ml) / mt) * 100) : 0;
                    return renderTotalsRow('Male Total', mp, ma, ml, me, mpct);
                  })()}
                  {femaleStudents.length > 0 && (() => {
                    let fp = 0, fa = 0, fl = 0, fe = 0;
                    femaleStudents.forEach(s => { fp += s.days_present; fa += s.days_absent; fl += s.days_late; fe += s.days_excused; });
                    const ft = fp + fa + fl + fe;
                    const fpct = ft > 0 ? Math.round(((fp + fl) / ft) * 100) : 0;
                    return renderTotalsRow('Female Total', fp, fa, fl, fe, fpct);
                  })()}
                  {renderTotalsRow('Grand Total', grandTotals.present, grandTotals.absent, grandTotals.late, grandTotals.excused, grandTotals.pct, true)}
                </tfoot>
              </table>
            </div>
          </div>

          {/* Print-only footer */}
          <div className="hidden print:block mt-8 text-[10px] text-slate-600">
            <div className="flex justify-between mt-8">
              <div className="text-center">
                <div className="border-t border-slate-400 w-40 mt-10 pt-1">Prepared by:</div>
                <div className="font-bold">{selectedClassroom?.teacher_name || 'Adviser Name'}</div>
                <div>Adviser</div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 w-40 mt-10 pt-1">Noted by:</div>
                <div className="font-bold">{schoolSettings?.site_name || 'School'} Head</div>
                <div>School Head</div>
              </div>
            </div>
            <p className="text-center mt-6 text-[8px] text-slate-400">Generated: {new Date().toLocaleString()}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceDashboard;
