import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Download, Printer, RefreshCw, ChevronDown, X, AlertTriangle,
} from 'lucide-react';
import api from '../utils/api';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { Skeleton, Button } from '../components/ui';
import toast from 'react-hot-toast';
import {
  ExportProgress, getPDFPageSetup, addPDFHeader, addPDFFooter, addSignatureBlock,
  createStyledWorkbook, addExcelHeader, autoSizeColumns, downloadExcelFile,
  generateExportFilename, validateExportData, handleExportError, sanitizeForExport,
  SCHOOL_INFO, DEPED_COLORS,
} from '../utils/exportHelpers';

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

const SUBJECT_LIST = [
  'Filipino', 'English', 'Mathematics', 'Science',
  'Araling Panlipunan', 'Values Education', 'TLE',
  'MAPEH', 'Music', 'Arts', 'PE', 'Health',
];

const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

function calculateAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function MasterSheet() {
  const { academicYear } = useActiveAcademicYear();
  const { periodValues } = useSystemSettings();
  const printRef = useRef(null);
  const [searchParams] = useSearchParams();

  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(searchParams.get('classroom') || '');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentProfile, setStudentProfile] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [sectionSubjects, setSectionSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/classrooms/').catch(() => ({ data: [] })),
      api.get('/users/?role=staff').catch(() => ({ data: [] })),
    ]).then(([c, t]) => {
      setClassrooms(Array.isArray(c.data) ? c.data : c.data?.results || []);
      setTeachers(Array.isArray(t.data) ? t.data : t.data?.results || []);
    });
  }, []);

  useEffect(() => {
    if (!selectedClassroom) { setStudents([]); setSelectedStudentId(''); return; }
    api.get(`/classroom-subjects/by_classroom/?classroom_id=${selectedClassroom}`)
      .then(r => setSectionSubjects(r.data))
      .catch(() => setSectionSubjects([]));
    api.get('/enrollments/', { params: { classroom: selectedClassroom, academic_year: academicYear || undefined } })
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : r.data?.results || [];
        const mapped = list.map(e => ({
          id: e.student,
          name: e.student_name || `${e.student_first_name || ''} ${e.student_last_name || ''}`.trim(),
        })).filter(s => s.id && s.name).sort((a, b) => a.name.localeCompare(b.name));
        setStudents(mapped);
      })
      .catch(() => setStudents([]));
  }, [selectedClassroom, academicYear]);

  const selectedStudent = useMemo(() => students.find(s => String(s.id) === String(selectedStudentId)), [students, selectedStudentId]);
  const classroomObj = useMemo(() => classrooms.find(c => c.id === parseInt(selectedClassroom)), [classrooms, selectedClassroom]);
  const teacherObj = useMemo(() => teachers.find(t => t.id === classroomObj?.teacher), [teachers, classroomObj]);

  useEffect(() => {
    if (!selectedStudentId) { setStudentProfile(null); return; }
    setProfileLoading(true);
    api.get('/student/profile/', { params: { student_id: selectedStudentId } })
      .then(r => setStudentProfile(r.data))
      .catch(() => setStudentProfile(null))
      .finally(() => setProfileLoading(false));
  }, [selectedStudentId]);

  const fetchGrades = useCallback(async () => {
    if (!selectedStudentId || !academicYear) return;
    setLoading(true);
    try {
      const results = [];
      for (const q of [1, 2, 3]) {
        const res = await api.get('/grades/', {
          params: { student: selectedStudentId, quarter: q, academic_year: academicYear },
        });
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        results.push(...list);
      }
      setGrades(results);
    } catch {
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId, academicYear]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  useEffect(() => {
    if (!selectedStudentId) { setAttendance([]); return; }
    api.get('/attendance/student-history/', { params: { student: selectedStudentId } })
      .then(r => setAttendance(Array.isArray(r.data) ? r.data : r.data?.results || []))
      .catch(() => setAttendance([]));
  }, [selectedStudentId]);

  const attendanceByMonth = useMemo(() => {
    const map = {};
    for (const rec of attendance) {
      const d = new Date(rec.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { present: 0, late: 0, absent: 0, excused: 0 };
      if (rec.status === 'present') map[key].present++;
      else if (rec.status === 'late') map[key].late++;
      else if (rec.status === 'absent') map[key].absent++;
      else if (rec.status === 'excused') map[key].excused++;
    }
    return map;
  }, [attendance]);

  const termGrades = useMemo(() => {
    const matrix = {};
    for (const g of grades) {
      const subName = g.subject_name || g.subject__name || '';
      const q = g.quarter;
      const key = `${subName}__${q}`;
      if (g.grade_type === 'final_grade' || (!g.component && g.raw_score !== null)) {
        if (!matrix[key] || g.grade_type === 'final_grade') {
          matrix[key] = g.raw_score !== null ? parseFloat(g.raw_score) : null;
        }
      }
    }
    const subjectNames = [...new Set(grades.map(g => g.subject_name || g.subject__name).filter(Boolean))];
    const result = {};
    for (const sub of subjectNames) {
      result[sub] = {};
      for (const q of [1, 2, 3]) {
        const key = `${sub}__${q}`;
        result[sub][q] = matrix[key] ?? null;
      }
      const vals = [1, 2, 3].map(q => result[sub][q]).filter(v => v !== null);
      result[sub].final = vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
    }
    return result;
  }, [grades]);

  const termAverages = useMemo(() => {
    const avgs = {};
    for (const q of [1, 2, 3]) {
      const vals = Object.values(termGrades).map(s => s[q]).filter(v => v !== null);
      avgs[q] = vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
    }
    const allFinals = Object.values(termGrades).map(s => s.final).filter(v => v !== null);
    avgs.final = allFinals.length ? parseFloat((allFinals.reduce((a, b) => a + b, 0) / allFinals.length).toFixed(2)) : null;
    return avgs;
  }, [termGrades]);

  const attendanceMonths = useMemo(() => {
    if (!attendance.length) return [];
    const monthSet = new Set();
    for (const rec of attendance) {
      const d = new Date(rec.date);
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return [...monthSet].sort().map(key => {
      const [y, m] = key.split('-');
      return { key, label: `${MONTHS[parseInt(m) - 1]} ${y}`, ...attendanceByMonth[key] };
    });
  }, [attendance, attendanceByMonth]);

  const totalAttendance = useMemo(() => {
    let present = 0, late = 0, absent = 0, excused = 0;
    for (const m of attendanceMonths) {
      present += m.present;
      late += m.late;
      absent += m.absent;
      excused += m.excused;
    }
    return { present, late, absent, excused, total: present + late + absent + excused };
  }, [attendanceMonths]);

  const matchedSubjects = useMemo(() => {
    return SUBJECT_LIST.filter(name =>
      Object.keys(termGrades).some(k => k.toLowerCase().includes(name.toLowerCase()))
    );
  }, [termGrades]);

  const getSubjectGrades = (subjectName) => {
    const key = Object.keys(termGrades).find(k => k.toLowerCase().includes(subjectName.toLowerCase()));
    return key ? termGrades[key] : null;
  };

  const handlePrint = () => { setPrintMode(true); setTimeout(() => window.print(), 300); };
  useEffect(() => {
    const h = () => setPrintMode(false);
    window.addEventListener('afterprint', h);
    return () => window.removeEventListener('afterprint', h);
  }, []);

  if (printMode) {
    return (
      <div ref={printRef} className="bg-white p-6 min-h-screen text-xs">
        <div className="text-center mb-4">
          <p className="text-[10px]">Republic of the Philippines</p>
          <p className="text-[10px] font-bold">Department of Education</p>
          <p className="text-[10px]">Region IV-A CALABARZON · Division of Cavite</p>
          <h1 className="text-sm font-bold mt-2">MASTER SHEET</h1>
        </div>
        <PrintContent
          profile={studentProfile} classroom={classroomObj} teacher={teacherObj}
          termGrades={termGrades} termAverages={termAverages}
          attendanceMonths={attendanceMonths} totalAttendance={totalAttendance}
          matchedSubjects={matchedSubjects} getSubjectGrades={getSubjectGrades}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Master Sheet</h2>
          <p className="text-sm text-gray-500">DepEd-style master sheet per student</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!selectedStudentId}>
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
          <div className="min-w-[160px]">
            <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase mb-0.5">Section <span className="text-red-400">*</span></label>
            <select value={selectedClassroom} onChange={e => { setSelectedClassroom(e.target.value); setSelectedStudentId(''); }}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-[7px] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Select section...</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase mb-0.5">Student <span className="text-red-400">*</span></label>
            <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} disabled={!selectedClassroom}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-[7px] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400">
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedClassroom(''); setSelectedStudentId(''); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={fetchGrades} disabled={!selectedStudentId}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {loading || profileLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : !selectedStudentId ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 text-center gap-3">
          <Search className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-gray-500">Select a section and student to view the master sheet</p>
        </div>
      ) : (
        <>
          <PrintHeader profile={studentProfile} classroom={classroomObj} teacher={teacherObj} />

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex">
              <div className="w-48 flex-shrink-0 border-r border-gray-200">
                <AttendanceSidebar months={attendanceMonths} total={totalAttendance} />
              </div>
              <div className="flex-1 overflow-x-auto">
                <GradesTable
                  matchedSubjects={matchedSubjects} getSubjectGrades={getSubjectGrades}
                  termAverages={termAverages}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PrintHeader({ profile, classroom, teacher }) {
  const p = profile?.profile || {};
  const teacherName = teacher ? `${teacher.last_name || ''}, ${teacher.first_name || ''}` : 'N/A';
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
      <div className="text-center mb-3">
        <p className="text-[10px] text-gray-500">Republic of the Philippines</p>
        <p className="text-xs font-bold text-gray-700">Department of Education</p>
        <p className="text-[10px] text-gray-500">Region IV-A CALABARZON · Division of Cavite</p>
      </div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
        <div><span className="text-gray-500">Name:</span> <span className="font-semibold">{profile ? `${profile.last_name || ''}, ${profile.first_name || ''} ${profile.middle_name || ''}` : '-'}</span></div>
        <div><span className="text-gray-500">LRN:</span> <span className="font-mono">{p.lrn || '-'}</span></div>
        <div><span className="text-gray-500">Sex:</span> <span className="font-semibold">{p.sex ? p.sex.charAt(0).toUpperCase() + p.sex.slice(1) : '-'}</span></div>
        <div><span className="text-gray-500">Birthday:</span> <span className="font-semibold">{p.date_of_birth || '-'}</span></div>
        <div><span className="text-gray-500">Age:</span> <span className="font-semibold">{calculateAge(p.date_of_birth) || '-'}</span></div>
        <div><span className="text-gray-500">Address:</span> <span className="font-semibold">{p.address || '-'}</span></div>
        <div><span className="text-gray-500">Grade/Section:</span> <span className="font-semibold">{classroom?.grade_level || '-'} - {classroom?.name || '-'}</span></div>
        <div><span className="text-gray-500">Adviser:</span> <span className="font-semibold">{teacherName}</span></div>
        <div><span className="text-gray-500">School Year:</span> <span className="font-semibold">{classroom?.academic_year_name || '-'}</span></div>
      </div>
    </div>
  );
}

function AttendanceSidebar({ months, total }) {
  return (
    <div className="text-[10px]">
      <div className="bg-violet-600 text-white font-bold text-center py-2 px-2 uppercase tracking-wide">
        Attendance
      </div>
      <div className="grid grid-cols-2 border-b border-gray-200">
        <div className="px-2 py-1 font-bold text-gray-600 border-r border-gray-200">Month</div>
        <div className="px-2 py-1 font-bold text-gray-600 text-center">Days</div>
      </div>
      {months.map((m, i) => (
        <div key={m.key} className={`grid grid-cols-2 border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
          <div className="px-2 py-1 border-r border-gray-200">{m.label}</div>
          <div className="px-2 py-1 text-center">{m.present + m.late}</div>
        </div>
      ))}
      <div className="grid grid-cols-2 bg-violet-50 font-bold border-t border-gray-300">
        <div className="px-2 py-1.5 border-r border-gray-300">Total</div>
        <div className="px-2 py-1.5 text-center">{total.present + total.late}</div>
      </div>
      <div className="px-2 py-1 text-[9px] text-gray-500 border-t border-gray-200">
        Present: {total.present} | Late: {total.late}
      </div>
    </div>
  );
}

function GradesTable({ matchedSubjects, getSubjectGrades, termAverages }) {
  return (
    <table className="w-full text-[11px] border-collapse">
      <thead>
        <tr>
          <th className="bg-violet-600 text-white font-bold text-center px-2 py-2 border border-violet-700 min-w-[130px]">Subject</th>
          <th className="bg-violet-600 text-white font-bold text-center px-2 py-2 border border-violet-700 min-w-[80px]">Term 1</th>
          <th className="bg-violet-600 text-white font-bold text-center px-2 py-2 border border-violet-700 min-w-[80px]">Term 2</th>
          <th className="bg-violet-600 text-white font-bold text-center px-2 py-2 border border-violet-700 min-w-[80px]">Term 3</th>
          <th className="bg-violet-800 text-white font-bold text-center px-2 py-2 border border-violet-700 min-w-[80px]">Final Grade</th>
        </tr>
      </thead>
      <tbody>
        {matchedSubjects.map((sub, idx) => {
          const sg = getSubjectGrades(sub);
          return (
            <tr key={sub} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              <td className="px-3 py-2 font-medium border-r border-gray-200">{sub}</td>
              {[1, 2, 3].map(q => (
                <td key={q} className="px-3 py-2 text-center border-r border-gray-200">
                  <span className={`font-semibold ${getGradeColor(sg?.[q])}`}>
                    {sg?.[q] !== null && sg?.[q] !== undefined ? sg[q].toFixed(1) : '-'}
                  </span>
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold bg-violet-50 border-l border-violet-200">
                <span className={getGradeColor(sg?.final)}>
                  {sg?.final !== null && sg?.final !== undefined ? sg.final.toFixed(1) : '-'}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
          <td className="px-3 py-2 text-right text-gray-600 border-r border-gray-300">Average</td>
          {[1, 2, 3].map(q => (
            <td key={q} className="px-3 py-2 text-center text-violet-700 border-r border-gray-300">
              {termAverages[q] !== null ? termAverages[q].toFixed(1) : '-'}
            </td>
          ))}
          <td className="px-3 py-2 text-center text-violet-800 bg-violet-100 border-l border-violet-300">
            {termAverages.final !== null ? termAverages.final.toFixed(1) : '-'}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function PrintContent({ profile, classroom, teacher, termGrades, termAverages, attendanceMonths, totalAttendance, matchedSubjects, getSubjectGrades }) {
  const p = profile?.profile || {};
  const teacherName = teacher ? `${teacher.last_name || ''}, ${teacher.first_name || ''}` : 'N/A';
  return (
    <div className="space-y-4">
      <div className="border border-gray-400 p-3 text-[10px]">
        <div className="grid grid-cols-3 gap-2">
          <div><b>Name:</b> {profile ? `${profile.last_name || ''}, ${profile.first_name || ''}` : '-'}</div>
          <div><b>LRN:</b> {p.lrn || '-'}</div>
          <div><b>Sex:</b> {p.sex || '-'}</div>
          <div><b>Birthday:</b> {p.date_of_birth || '-'}</div>
          <div><b>Age:</b> {calculateAge(p.date_of_birth) || '-'}</div>
          <div><b>Address:</b> {p.address || '-'}</div>
          <div><b>Grade/Section:</b> {classroom?.grade_level || '-'} - {classroom?.name || '-'}</div>
          <div><b>Adviser:</b> {teacherName}</div>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="w-40 border border-gray-400 text-[9px]">
          <div className="bg-gray-200 font-bold text-center py-1 border-b border-gray-400">Attendance</div>
          {attendanceMonths.map(m => (
            <div key={m.key} className="flex justify-between px-2 py-0.5 border-b border-gray-300">
              <span>{m.label}</span><span>{m.present + m.late}</span>
            </div>
          ))}
          <div className="flex justify-between px-2 py-0.5 font-bold bg-gray-100 border-t border-gray-400">
            <span>Total</span><span>{totalAttendance.present + totalAttendance.late}</span>
          </div>
        </div>
        <div className="flex-1 border border-gray-400 text-[10px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-2 py-1 text-left">Subject</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Term 1</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Term 2</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Term 3</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Final</th>
              </tr>
            </thead>
            <tbody>
              {matchedSubjects.map(sub => {
                const sg = getSubjectGrades(sub);
                return (
                  <tr key={sub}>
                    <td className="border border-gray-400 px-2 py-0.5">{sub}</td>
                    {[1, 2, 3].map(q => (
                      <td key={q} className="border border-gray-400 px-2 py-0.5 text-center">{sg?.[q] !== null && sg?.[q] !== undefined ? sg[q].toFixed(1) : ''}</td>
                    ))}
                    <td className="border border-gray-400 px-2 py-0.5 text-center font-bold">{sg?.final !== null && sg?.final !== undefined ? sg.final.toFixed(1) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-400 px-2 py-0.5 text-right">Average</td>
                {[1, 2, 3].map(q => (
                  <td key={q} className="border border-gray-400 px-2 py-0.5 text-center">{termAverages[q] !== null ? termAverages[q].toFixed(1) : ''}</td>
                ))}
                <td className="border border-gray-400 px-2 py-0.5 text-center">{termAverages.final !== null ? termAverages.final.toFixed(1) : ''}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-8 text-[10px]">
        <div>Prepared by: __________________________<br />{teacherName}</div>
        <div>Noted by: __________________________<br />School Principal</div>
      </div>
    </div>
  );
}
