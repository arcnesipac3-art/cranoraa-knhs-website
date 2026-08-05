import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, Filter, Printer, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { Skeleton, Button } from '../components/ui';
import toast from 'react-hot-toast';

const getGradeColor = (score) => {
  if (score === null || score === undefined) return 'text-gray-400';
  if (score >= 90) return 'text-emerald-700 bg-emerald-50';
  if (score >= 85) return 'text-blue-700 bg-blue-50';
  if (score >= 80) return 'text-green-700 bg-green-50';
  if (score >= 75) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
};

export default function GradingSheet() {
  const { academicYear } = useActiveAcademicYear();
  const { periodValues } = useSystemSettings();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    api.get('/classrooms/').then(r => setClassrooms(r.data)).catch(() => {});
  }, []);

  const fetchGrades = useCallback(async () => {
    if (!selectedClassroom || !academicYear) return;
    setLoading(true);
    try {
      const res = await api.get('/grades/by_classroom/', {
        params: { classroom_id: selectedClassroom, quarter: selectedQuarter },
      });
      setGrades(res.data);
    } catch {
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, [selectedClassroom, selectedQuarter, academicYear]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const { students, subjectData, subjectGroups } = useMemo(() => {
    const stMap = {};
    const subMap = {};
    const subGroups = {};

    for (const g of grades) {
      if (!g.student_name) continue;
      const stKey = g.student;
      if (!stMap[stKey]) stMap[stKey] = { id: g.student, name: g.student_name, email: g.student_email };
      if (!subMap[g.subject]) subMap[g.subject] = { id: g.subject, name: g.subject_name, code: g.subject_code, has_components: g.has_components };
    }

    for (const g of grades) {
      if (!g.student_name) continue;
      const subKey = g.component ? `${g.subject}__${g.component}` : `${g.subject}`;
      if (!subGroups[subKey]) subGroups[subKey] = { subjectId: g.subject, subjectName: g.subject_name, component: g.component || '', subjectCode: g.subject_code };
    }

    const gradeMatrix = {};
    for (const g of grades) {
      const stKey = g.student;
      const subKey = g.component ? `${g.subject}__${g.component}` : `${g.subject}`;
      if (!gradeMatrix[stKey]) gradeMatrix[stKey] = {};
      if (!gradeMatrix[stKey][subKey]) gradeMatrix[stKey][subKey] = {};
      gradeMatrix[stKey][subKey][g.grade_type] = g.raw_score;
    }

    return {
      students: Object.values(stMap),
      subjectData: subMap,
      subjectGroups: Object.entries(subGroups).map(([key, val]) => ({
        key,
        ...val,
        isComponent: key.includes('__'),
      })),
      gradeMatrix,
    };
  }, [grades]);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(q));
  }, [students, search]);

  const selectedClassroomObj = classrooms.find(c => c.id === parseInt(selectedClassroom));

  const computeFinal = (ww, pt, qa) => {
    const scores = [ww, pt, qa].filter(s => s !== null && s !== undefined);
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + parseFloat(b), 0) / scores.length).toFixed(2);
  };

  const computeMAPEHFinal = (studentId, subjectId) => {
    const musicArts = grades.find(g => g.student === studentId && g.subject === subjectId && g.component === 'music_arts' && g.grade_type === 'final_grade');
    const peHealth = grades.find(g => g.student === studentId && g.subject === subjectId && g.component === 'pe_health' && g.grade_type === 'final_grade');
    const scores = [musicArts?.raw_score, peHealth?.raw_score].filter(s => s !== null && s !== undefined);
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + parseFloat(b), 0) / scores.length).toFixed(2);
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    if (!filteredStudents.length) return;
    const mainSubjects = subjectGroups.filter(s => !s.isComponent);
    const headers = ['Student', ...mainSubjects.map(s => s.subjectCode || s.subjectName), 'General Average'];
    const rows = filteredStudents.map(s => {
      const scores = mainSubjects.map(sub => {
        if (subjectData[sub.subjectId]?.has_components) {
          return computeMAPEHFinal(s.id, sub.subjectId);
        }
        return computeFinal(
          gradeMatrix[s.id]?.[sub.key]?.written_work,
          gradeMatrix[s.id]?.[sub.key]?.performance_task,
          gradeMatrix[s.id]?.[sub.key]?.quarterly_assessment
        );
      });
      const validScores = scores.filter(x => x !== null);
      const avg = validScores.length ? (validScores.reduce((a, b) => a + parseFloat(b), 0) / validScores.length).toFixed(2) : '';
      return [s.name, ...scores, avg];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `grading-sheet-${selectedClassroomObj?.name || 'class'}-Q${selectedQuarter}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Grading Sheet</h2>
          <p className="text-sm text-gray-500">Detailed WW / PT / QA / Final breakdown per subject</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Classroom</label>
          <select
            value={selectedClassroom}
            onChange={e => setSelectedClassroom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            <option value="">Select classroom</option>
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Quarter</label>
          <select
            value={selectedQuarter}
            onChange={e => setSelectedQuarter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            {periodValues.map(q => (
              <option key={q} value={q}>Term {q}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search student..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-56"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchGrades}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : !selectedClassroom ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 text-center gap-3">
          <Filter className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-gray-500">Select a classroom to view the grading sheet</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 text-center gap-3">
          <p className="text-sm text-gray-500">No grades found for this classroom and quarter</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                    Student Name
                  </th>
                  {subjectGroups.filter(s => !s.isComponent).map(sub => {
                    const isExpanded = expandedSubject === sub.subjectId;
                    const hasComponents = subjectData[sub.subjectId]?.has_components;
                    return (
                      <th
                        key={sub.key}
                        colSpan={hasComponents ? 2 : 1}
                        className={`px-2 py-3 text-center font-semibold text-gray-700 border-l border-gray-200 cursor-pointer hover:bg-gray-100 ${hasComponents ? 'bg-violet-50' : ''}`}
                        onClick={() => setExpandedSubject(isExpanded ? null : sub.subjectId)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {sub.subjectCode || sub.subjectName}
                          {hasComponents && <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 bg-gray-100 border-l border-gray-200 min-w-[90px]">
                    General Avg
                  </th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 z-10"></th>
                  {subjectGroups.filter(s => !s.isComponent).map(sub => {
                    const hasComponents = subjectData[sub.subjectId]?.has_components;
                    if (hasComponents) {
                      return (
                        <th key={sub.key + '_wrap'} colSpan={2} className="border-l border-gray-200 px-0 py-0">
                          <div className="flex">
                            <div className="flex-1 px-1 py-1 text-center text-[10px] font-medium text-violet-600 border-r border-gray-200">Music & Arts</div>
                            <div className="flex-1 px-1 py-1 text-center text-[10px] font-medium text-violet-600">PE & Health</div>
                          </div>
                        </th>
                      );
                    }
                    return (
                      <th key={sub.key + '_sub'} className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200">
                        Final
                      </th>
                    );
                  })}
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 bg-gray-50 border-l border-gray-200"></th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const mainSubjects = subjectGroups.filter(s => !s.isComponent);
                  const generalScores = mainSubjects.map(sub => {
                    if (subjectData[sub.subjectId]?.has_components) {
                      return computeMAPEHFinal(student.id, sub.subjectId);
                    }
                    return computeFinal(
                      gradeMatrix[student.id]?.[sub.key]?.written_work,
                      gradeMatrix[student.id]?.[sub.key]?.performance_task,
                      gradeMatrix[student.id]?.[sub.key]?.quarterly_assessment
                    );
                  }).filter(s => s !== null);
                  const generalAvg = generalScores.length ? (generalScores.reduce((a, b) => a + parseFloat(b), 0) / generalScores.length).toFixed(2) : null;

                  return (
                    <tr key={student.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-900 sticky left-0 z-10" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <div>{student.name}</div>
                      </td>
                      {mainSubjects.map(sub => {
                        const hasComponents = subjectData[sub.subjectId]?.has_components;
                        if (hasComponents) {
                          const maScore = gradeMatrix[student.id]?.[`${sub.subjectId}__music_arts`]?.final_grade;
                          const peScore = gradeMatrix[student.id]?.[`${sub.subjectId}__pe_health`]?.final_grade;
                          return (
                            <td key={sub.key + '_wrap'} colSpan={2} className="px-0 py-1 border-l border-gray-200">
                              <div className="flex">
                                <div className="flex-1 px-1 py-0.5 text-center">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${getGradeColor(maScore)}`}>
                                    {maScore !== null && maScore !== undefined ? parseFloat(maScore).toFixed(1) : '-'}
                                  </span>
                                </div>
                                <div className="flex-1 px-1 py-0.5 text-center">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${getGradeColor(peScore)}`}>
                                    {peScore !== null && peScore !== undefined ? parseFloat(peScore).toFixed(1) : '-'}
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        }
                        const final = computeFinal(
                          gradeMatrix[student.id]?.[sub.key]?.written_work,
                          gradeMatrix[student.id]?.[sub.key]?.performance_task,
                          gradeMatrix[student.id]?.[sub.key]?.quarterly_assessment
                        );
                        return (
                          <td key={sub.key} className="px-2 py-2.5 text-center border-l border-gray-200">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${getGradeColor(final)}`}>
                              {final !== null ? parseFloat(final).toFixed(1) : '-'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center bg-gray-50 border-l border-gray-200">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${getGradeColor(generalAvg)}`}>
                          {generalAvg !== null ? parseFloat(generalAvg).toFixed(2) : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>{filteredStudents.length} students · {subjectGroups.filter(s => !s.isComponent).length} subjects</span>
            <span>{selectedClassroomObj?.name} · Term {selectedQuarter} · {academicYear}</span>
          </div>
        </div>
      )}
    </div>
  );
}
