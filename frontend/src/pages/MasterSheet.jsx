import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Printer, RefreshCw, X, FileText, Download, Loader2,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { Skeleton, Button } from '../components/ui';
import toast from 'react-hot-toast';

const getGradeColor = (score) => {
  if (score === null || score === undefined) return 'text-gray-400';
  if (score >= 90) return 'text-emerald-700';
  if (score >= 85) return 'text-blue-700';
  if (score >= 80) return 'text-green-700';
  if (score >= 75) return 'text-amber-700';
  return 'text-red-700';
};

const SUBJECT_ORDER = [
  'Filipino', 'English', 'Mathematics', 'Science',
  'Araling Panlipunan', 'Values Education', 'Edukasyon sa Pagpapakatao',
  'TLE', 'Technology and Livelihood Education',
  'MAPEH', 'Music', 'Arts', 'Physical Education', 'PE', 'Health',
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

function computeTermGrades(grades) {
  const matrix = {};
  for (const g of grades) {
    const subName = g.subject_name || g.subject__name || g.subject_name__name || '';
    if (!subName) continue;
    const q = g.quarter;
    const key = `${subName}__${q}`;
    const val = g.raw_score !== null && g.raw_score !== undefined ? parseFloat(g.raw_score) : null;
    if (g.grade_type === 'final_grade' && !g.component) {
      matrix[key] = val;
    } else if (!(key in matrix) && val !== null) {
      matrix[key] = val;
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
}

function computeTermAverages(termGrades) {
  const avgs = {};
  for (const q of [1, 2, 3]) {
    const vals = Object.values(termGrades).map(s => s[q]).filter(v => v !== null);
    avgs[q] = vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
  }
  const allFinals = Object.values(termGrades).map(s => s.final).filter(v => v !== null);
  avgs.final = allFinals.length ? parseFloat((allFinals.reduce((a, b) => a + b, 0) / allFinals.length).toFixed(2)) : null;
  return avgs;
}

function computeAttendance(attendance) {
  const byMonth = {};
  for (const rec of attendance) {
    const d = new Date(rec.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { present: 0, late: 0, absent: 0, excused: 0 };
    if (rec.status === 'present') byMonth[key].present++;
    else if (rec.status === 'late') byMonth[key].late++;
    else if (rec.status === 'absent') byMonth[key].absent++;
    else if (rec.status === 'excused') byMonth[key].excused++;
  }
  const months = [];
  const monthSet = new Set();
  for (const rec of attendance) {
    const d = new Date(rec.date);
    monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  for (const key of [...monthSet].sort()) {
    const [y, m] = key.split('-');
    months.push({ key, label: `${MONTHS[parseInt(m) - 1]} ${y}`, ...byMonth[key] });
  }
  let present = 0, late = 0, absent = 0, excused = 0;
  for (const m of months) {
    present += m.present;
    late += m.late;
    absent += m.absent;
    excused += m.excused;
  }
  return { months, total: { present, late, absent, excused, days: present + late } };
}

function getMatchedSubjects(termGrades) {
  const keys = Object.keys(termGrades);
  return keys.sort((a, b) => {
    const aIdx = SUBJECT_ORDER.findIndex(s => a.toLowerCase().includes(s.toLowerCase()));
    const bIdx = SUBJECT_ORDER.findIndex(s => b.toLowerCase().includes(s.toLowerCase()));
    const aOrder = aIdx >= 0 ? aIdx : 999;
    const bOrder = bIdx >= 0 ? bIdx : 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.localeCompare(b);
  });
}

function getSubjectGrade(termGrades, subjectName) {
  return termGrades[subjectName] || null;
}

export default function MasterSheet() {
  const { user } = useAuth();
  const { academicYear } = useActiveAcademicYear();
  const printRef = useRef(null);
  const [searchParams] = useSearchParams();
  const isTeacher = user?.role === 'staff';

  const [allClassrooms, setAllClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(searchParams.get('classroom') || '');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [sectionSubjects, setSectionSubjects] = useState([]);

  const [loading, setLoading] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [exporting, setExporting] = useState(null);

  const [allStudentData, setAllStudentData] = useState([]);
  const [singleProfile, setSingleProfile] = useState(null);
  const [singleGrades, setSingleGrades] = useState([]);
  const [singleAttendance, setSingleAttendance] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/classrooms/').catch(() => ({ data: [] })),
      api.get('/users/?role=staff').catch(() => ({ data: [] })),
    ]).then(([c, t]) => {
      setAllClassrooms(Array.isArray(c.data) ? c.data : c.data?.results || []);
      setTeachers(Array.isArray(t.data) ? t.data : t.data?.results || []);
    });
  }, []);

  // For teachers: fetch their classroom-subject assignments to determine which classrooms/subjects they can see
  const [myAssignments, setMyAssignments] = useState([]);
  useEffect(() => {
    if (!isTeacher) return;
    api.get('/classroom-subjects/')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : r.data?.results || [];
        setMyAssignments(list.filter(a => a.teacher === user?.id));
      })
      .catch(() => setMyAssignments([]));
  }, [isTeacher, user?.id]);

  // Filtered classrooms: teachers only see classrooms where they have assigned subjects
  const classrooms = useMemo(() => {
    if (!isTeacher) return allClassrooms;
    const myClassroomIds = new Set(myAssignments.map(a => a.classroom));
    return allClassrooms.filter(c => myClassroomIds.has(c.id));
  }, [allClassrooms, isTeacher, myAssignments]);

  // Auto-select first section for teachers
  useEffect(() => {
    if (isTeacher && classrooms.length > 0 && !selectedClassroom) {
      setSelectedClassroom(String(classrooms[0].id));
    }
  }, [isTeacher, classrooms, selectedClassroom]);

  // Filtered section subjects: teachers only see subjects they're assigned to in this section
  const filteredSectionSubjects = useMemo(() => {
    if (!isTeacher) return sectionSubjects;
    const mySubjectIds = new Set(myAssignments.filter(a => a.classroom === parseInt(selectedClassroom)).map(a => a.subject));
    return sectionSubjects.filter(s => mySubjectIds.has(s.subject));
  }, [sectionSubjects, isTeacher, myAssignments, selectedClassroom]);

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

  const classroomObj = useMemo(() => classrooms.find(c => c.id === parseInt(selectedClassroom)), [classrooms, selectedClassroom]);
  const teacherObj = useMemo(() => teachers.find(t => t.id === classroomObj?.teacher), [teachers, classroomObj]);

  const isAll = selectedStudentId === 'all';

  useEffect(() => {
    if (!isAll || !selectedClassroom || !academicYear) { setAllStudentData([]); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const results = [];
        for (const st of students) {
          const [profRes, gradeRes, attRes] = await Promise.all([
            api.get('/student/profile/', { params: { student_id: st.id } }).catch(() => ({ data: null })),
            Promise.all([1, 2, 3].map(q =>
              api.get('/grades/', { params: { student: st.id, quarter: q, academic_year: academicYear } })
                .then(r => Array.isArray(r.data) ? r.data : r.data?.results || [])
                .catch(() => [])
            )).then(arrs => arrs.flat()),
            api.get('/attendance/student-history/', { params: { student: st.id } })
              .then(r => Array.isArray(r.data) ? r.data : r.data?.results || [])
              .catch(() => []),
          ]);
          if (cancelled) return;
          results.push({
            id: st.id,
            name: st.name,
            profile: profRes.data,
            grades: gradeRes,
            attendance: attRes,
          });
        }
        if (!cancelled) setAllStudentData(results);
      } catch {
        if (!cancelled) toast.error('Failed to load student data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAll, students, selectedClassroom, academicYear]);

  useEffect(() => {
    if (isAll || !selectedStudentId || selectedStudentId === 'all') { setSingleProfile(null); setSingleGrades([]); setSingleAttendance([]); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [profRes, gradeRes, attRes] = await Promise.all([
          api.get('/student/profile/', { params: { student_id: selectedStudentId } }).catch(() => ({ data: null })),
          Promise.all([1, 2, 3].map(q =>
            api.get('/grades/', { params: { student: selectedStudentId, quarter: q, academic_year: academicYear } })
              .then(r => Array.isArray(r.data) ? r.data : r.data?.results || [])
              .catch(() => [])
          )).then(arrs => arrs.flat()),
          api.get('/attendance/student-history/', { params: { student: selectedStudentId } })
            .then(r => Array.isArray(r.data) ? r.data : r.data?.results || [])
            .catch(() => []),
        ]);
        if (!cancelled) {
          setSingleProfile(profRes.data);
          setSingleGrades(gradeRes);
          setSingleAttendance(attRes);
        }
      } catch {
        if (!cancelled) toast.error('Failed to load student data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedStudentId, academicYear, isAll]);

  const handlePrint = () => { setPrintMode(true); setTimeout(() => window.print(), 300); };

  const handleExportPDF = async () => {
    if (!showContent) return;
    setExporting('pdf');
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const container = printRef.current || document.querySelector('[data-master-sheet]');
      if (!container) {
        setPrintMode(true);
        await new Promise(r => setTimeout(r, 400));
        const el = printRef.current;
        if (!el) { toast.error('Could not find content to export'); setExporting(null); return; }
        const canvas = await html2canvas(el, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const imgW = pw - 20;
        const imgH = (canvas.height * imgW) / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 10, imgW, Math.min(imgH, ph - 20));
        pdf.save(`MasterSheet-${classroomObj?.name || 'class'}.pdf`);
        setPrintMode(false);
        toast.success('PDF exported');
        setExporting(null);
        return;
      }
      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgW = pw - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgW, Math.min(imgH, ph - 20));
      pdf.save(`MasterSheet-${classroomObj?.name || 'class'}.pdf`);
      toast.success('PDF exported');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('PDF export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    if (!showContent) return;
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const data = isAll ? allStudentData : [{ profile: singleProfile, grades: singleGrades, attendance: singleAttendance }];

      for (const item of data) {
        if (!item.profile) continue;
        const p = item.profile?.profile || {};
        const studentName = `${item.profile.last_name || ''}, ${item.profile.first_name || ''} ${item.profile.middle_name || ''}`.trim();
        const grades = isTeacher && myAssignments?.length
          ? item.grades.filter(g => new Set(myAssignments.map(a => a.subject)).has(g.subject))
          : item.grades;
        const termGrades = computeTermGrades(grades);
        const matchedSubjects = getMatchedSubjects(termGrades);
        const attData = computeAttendance(item.attendance);

        const rows = [
          ['MASTER SHEET'],
          ['Republic of the Philippines'],
          ['Department of Education'],
          ['Region X - Iligan City · Division of Lanao del Norte'],
          [],
          ['Name:', studentName, 'LRN:', p.lrn || '', 'Sex:', p.sex || ''],
          ['Grade Level:', classroomObj?.grade_level || '', 'Section:', classroomObj?.name || '', 'SY:', academicYear || ''],
          [],
          ['SUBJECT', 'T1', 'T2', 'T3', 'Final'],
        ];

        for (const sub of matchedSubjects) {
          const tg = termGrades[sub];
          rows.push([sub, tg[1] ?? '', tg[2] ?? '', tg[3] ?? '', tg.final ?? '']);
        }

        rows.push([]);
        rows.push(['ATTENDANCE']);
        rows.push(['Month', 'Present', 'Late', 'Absent', 'Excused']);
        for (const m of attData.months) {
          rows.push([m.label, m.present, m.late, m.absent, m.excused]);
        }
        rows.push(['Total', attData.total.present, attData.total.late, attData.total.absent, attData.total.excused]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
        const sheetName = (studentName || `Student${item.profile.id}`).substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      XLSX.writeFile(wb, `MasterSheet-${classroomObj?.name || 'class'}.xlsx`);
      toast.success('Excel exported');
    } catch (err) {
      console.error('Excel export failed:', err);
      toast.error('Excel export failed');
    } finally {
      setExporting(null);
    }
  };
  useEffect(() => {
    const h = () => setPrintMode(false);
    window.addEventListener('afterprint', h);
    return () => window.removeEventListener('afterprint', h);
  }, []);

  const showContent = isAll ? allStudentData.length > 0 : !!selectedStudentId;

  if (printMode) {
    const items = isAll
      ? allStudentData.map(d => ({ profile: d.profile, grades: d.grades, attendance: d.attendance }))
      : [{ profile: singleProfile, grades: singleGrades, attendance: singleAttendance }];
    return (
      <div ref={printRef} className="bg-white p-6 min-h-screen text-xs">
        <div className="text-center mb-4">
          <p className="text-[10px]">Republic of the Philippines</p>
          <p className="text-[10px] font-bold">Department of Education</p>
          <p className="text-[10px]">Region X - Iligan City · Division of Lanao del Norte</p>
          <h1 className="text-sm font-bold mt-2">MASTER SHEET</h1>
          <p className="text-[10px] mt-1">{classroomObj?.grade_level || ''} - {classroomObj?.name || ''} · {academicYear}</p>
        </div>
        {items.map((item, idx) => (
          <div key={item.profile?.id || idx} className={idx > 0 ? 'page-break-before mt-8' : ''}>
            <PrintContent
              profile={item.profile} classroom={classroomObj} teacher={teacherObj}
              grades={item.grades} attendance={item.attendance}
              myAssignments={myAssignments} isTeacher={isTeacher}
            />
          </div>
        ))}
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
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!showContent}>
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!showContent || exporting === 'pdf'}>
            {exporting === 'pdf' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />} PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!showContent || exporting === 'excel'}>
            {exporting === 'excel' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />} Excel
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
              <option value="all">All Students</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedClassroom(''); setSelectedStudentId(''); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (isAll) {
                setSelectedStudentId('all');
              } else if (selectedStudentId) {
                setSelectedStudentId(prev => prev);
              }
            }} disabled={!showContent}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : !showContent ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 text-center gap-3">
          <Search className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-gray-500">Select a section and student to view the master sheet</p>
        </div>
      ) : isAll ? (
        <div ref={printRef} data-master-sheet className="space-y-6">
          {allStudentData.map((d, idx) => (
            <StudentSheet
              key={d.id}
              profile={d.profile}
              grades={d.grades}
              attendance={d.attendance}
              classroom={classroomObj}
              teacher={teacherObj}
              index={idx}
              myAssignments={myAssignments}
              isTeacher={isTeacher}
            />
          ))}
        </div>
      ) : (
        <div ref={printRef} data-master-sheet>
        <StudentSheet
          profile={singleProfile}
          grades={singleGrades}
          attendance={singleAttendance}
          classroom={classroomObj}
          teacher={teacherObj}
          index={0}
          myAssignments={myAssignments}
          isTeacher={isTeacher}
        />
        </div>
      )}
    </div>
  );
}

function StudentSheet({ profile, grades, attendance, classroom, teacher, index, myAssignments, isTeacher }) {
  const filteredGrades = useMemo(() => {
    if (!isTeacher || !myAssignments?.length) return grades;
    const mySubjectIds = new Set(myAssignments.map(a => a.subject));
    return grades.filter(g => mySubjectIds.has(g.subject));
  }, [grades, isTeacher, myAssignments]);

  const termGrades = useMemo(() => computeTermGrades(filteredGrades), [filteredGrades]);
  const termAverages = useMemo(() => computeTermAverages(termGrades), [termGrades]);
  const attData = useMemo(() => computeAttendance(attendance), [attendance]);
  const matchedSubjects = useMemo(() => getMatchedSubjects(termGrades), [termGrades]);

  const p = profile?.profile || {};
  const teacherName = teacher ? `${teacher.last_name || ''}, ${teacher.first_name || ''}` : 'N/A';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <div className="text-center mb-2">
          <p className="text-[10px] text-gray-500">Republic of the Philippines</p>
          <p className="text-[11px] font-bold text-gray-700">Department of Education</p>
          <p className="text-[10px] text-gray-500">Region X - Iligan City · Division of Lanao del Norte</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-[11px]">
          <div><span className="text-gray-500">Name:</span> <span className="font-semibold">{profile ? `${profile.last_name || ''}, ${profile.first_name || ''} ${profile.middle_name || ''}` : '-'}</span></div>
          <div><span className="text-gray-500">LRN:</span> <span className="font-mono">{p.lrn || '-'}</span></div>
          <div><span className="text-gray-500">Sex:</span> <span className="font-semibold">{p.sex ? p.sex.charAt(0).toUpperCase() + p.sex.slice(1) : '-'}</span></div>
          <div><span className="text-gray-500">Birthday:</span> <span className="font-semibold">{p.date_of_birth || '-'}</span></div>
          <div><span className="text-gray-500">Age:</span> <span className="font-semibold">{calculateAge(p.date_of_birth) || '-'}</span></div>
          <div><span className="text-gray-500">Address:</span> <span className="font-semibold">{p.address || '-'}</span></div>
          <div><span className="text-gray-500">Section:</span> <span className="font-semibold">{classroom?.name || '-'}</span></div>
          <div><span className="text-gray-500">Adviser:</span> <span className="font-semibold">{teacherName}</span></div>
          <div><span className="text-gray-500">School Year:</span> <span className="font-semibold">{classroom?.academic_year_name || '-'}</span></div>
        </div>
      </div>

      <div className="flex">
        <div className="w-52 flex-shrink-0 border-r border-gray-200">
          <AttendanceSidebar months={attData.months} total={attData.total} />
        </div>
        <div className="flex-1 overflow-x-auto">
          <GradesTable matchedSubjects={matchedSubjects} termGrades={termGrades} termAverages={termAverages} />
        </div>
      </div>
    </div>
  );
}

function AttendanceSidebar({ months, total }) {
  const totalDays = total.present + total.late + total.absent + total.excused;
  return (
    <div className="text-[10px] min-h-full">
      <div className="bg-violet-600 text-white font-bold text-center py-2 px-2 uppercase tracking-widest text-[9px]">
        Attendance
      </div>
      <div className="grid grid-cols-4 border-b border-gray-200 bg-gray-50">
        <div className="px-1.5 py-1 font-bold text-gray-500 border-r border-gray-200">Month</div>
        <div className="px-1 py-1 font-bold text-gray-500 text-center border-r border-gray-200">P</div>
        <div className="px-1 py-1 font-bold text-gray-500 text-center border-r border-gray-200">L</div>
        <div className="px-1 py-1 font-bold text-gray-500 text-center">A</div>
      </div>
      {months.length === 0 ? (
        <div className="px-2 py-4 text-center text-gray-400 italic">No data</div>
      ) : months.map((m, i) => (
        <div key={m.key} className={`grid grid-cols-4 border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'}`}>
          <div className="px-1.5 py-1 border-r border-gray-200 font-medium text-gray-700 truncate">{m.label}</div>
          <div className="px-1 py-1 text-center border-r border-gray-200 text-emerald-700 font-semibold">{m.present}</div>
          <div className="px-1 py-1 text-center border-r border-gray-200 text-amber-600 font-semibold">{m.late}</div>
          <div className="px-1 py-1 text-center text-red-500 font-semibold">{m.absent}</div>
        </div>
      ))}
      {months.length > 0 && (
        <>
          <div className="grid grid-cols-4 bg-violet-100 font-bold border-t-2 border-violet-300">
            <div className="px-1.5 py-1.5 border-r border-violet-300 text-violet-800">Total</div>
            <div className="px-1 py-1.5 text-center border-r border-violet-300 text-emerald-800">{total.present}</div>
            <div className="px-1 py-1.5 text-center border-r border-violet-300 text-amber-800">{total.late}</div>
            <div className="px-1 py-1.5 text-center text-red-700">{total.absent}</div>
          </div>
          <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-200 space-y-0.5">
            <div className="flex justify-between text-gray-600">
              <span>School Days:</span><span className="font-bold">{totalDays}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Days Attended:</span><span className="font-bold text-emerald-700">{total.present + total.late}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Attendance Rate:</span>
              <span className={`font-bold ${totalDays > 0 && ((total.present + total.late) / totalDays * 100) >= 85 ? 'text-emerald-700' : 'text-red-600'}`}>
                {totalDays > 0 ? ((total.present + total.late) / totalDays * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GradesTable({ matchedSubjects, termGrades, termAverages }) {
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
          const sg = termGrades[sub] || null;
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

function PrintContent({ profile, classroom, teacher, grades, attendance, myAssignments, isTeacher }) {
  const filteredGrades = isTeacher && myAssignments?.length
    ? grades.filter(g => new Set(myAssignments.map(a => a.subject)).has(g.subject))
    : grades;
  const termGrades = computeTermGrades(filteredGrades);
  const termAverages = computeTermAverages(termGrades);
  const attData = computeAttendance(attendance);
  const matchedSubjects = getMatchedSubjects(termGrades);
  const p = profile?.profile || {};
  const teacherName = teacher ? `${teacher.last_name || ''}, ${teacher.first_name || ''}` : 'N/A';
  return (
    <div className="space-y-3">
      <div className="border border-gray-400 p-3 text-[10px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          <div><b>Name:</b> {profile ? `${profile.last_name || ''}, ${profile.first_name || ''}` : '-'}</div>
          <div><b>LRN:</b> {p.lrn || '-'}</div>
          <div><b>Sex:</b> {p.sex || '-'}</div>
          <div><b>Birthday:</b> {p.date_of_birth || '-'}</div>
          <div><b>Age:</b> {calculateAge(p.date_of_birth) || '-'}</div>
          <div><b>Address:</b> {p.address || '-'}</div>
          <div><b>Section:</b> {classroom?.name || '-'}</div>
          <div><b>Adviser:</b> {teacherName}</div>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="w-40 border border-gray-400 text-[9px]">
          <div className="bg-gray-200 font-bold text-center py-1 border-b border-gray-400">Attendance</div>
          {attData.months.map(m => (
            <div key={m.key} className="flex justify-between px-2 py-0.5 border-b border-gray-300">
              <span>{m.label}</span><span>{m.present + m.late}</span>
            </div>
          ))}
          <div className="flex justify-between px-2 py-0.5 font-bold bg-gray-100 border-t border-gray-400">
            <span>Total</span><span>{attData.total.days}</span>
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
                const sg = termGrades[sub] || null;
                return (
                  <tr key={sub}>
                    <td className="border border-gray-400 px-2 py-0.5">{sub}</td>
                    {[1, 2, 3].map(q => (
                      <td key={q} className="border border-gray-400 px-2 py-0.5 text-center">{sg?.[q] != null ? sg[q].toFixed(1) : ''}</td>
                    ))}
                    <td className="border border-gray-400 px-2 py-0.5 text-center font-bold">{sg?.final != null ? sg.final.toFixed(1) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-400 px-2 py-0.5 text-right">Average</td>
                {[1, 2, 3].map(q => (
                  <td key={q} className="border border-gray-400 px-2 py-0.5 text-center">{termAverages[q] != null ? termAverages[q].toFixed(1) : ''}</td>
                ))}
                <td className="border border-gray-400 px-2 py-0.5 text-center">{termAverages.final != null ? termAverages.final.toFixed(1) : ''}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-8 text-[10px]">
        <div>Prepared by: __________________________<br />{teacherName}</div>
        <div>Noted by: __________________________<br />School Principal</div>
      </div>
    </div>
  );
}
