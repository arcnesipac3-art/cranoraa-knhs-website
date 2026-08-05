import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, Filter, ChevronDown, Printer, RefreshCw } from 'lucide-react';
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

const getRemark = (score) => {
  if (score === null || score === undefined) return '-';
  if (score >= 90) return 'Outstanding';
  if (score >= 85) return 'Very Satisfactory';
  if (score >= 80) return 'Satisfactory';
  if (score >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet';
};

export default function MasterSheet() {
  const { academicYear } = useActiveAcademicYear();
  const { periodValues } = useSystemSettings();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

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

  const { studentMap, subjects, subjectIds } = useMemo(() => {
    const sMap = {};
    const subMap = {};
    for (const g of grades) {
      if (!g.student_name) continue;
      const key = g.student;
      if (!sMap[key]) sMap[key] = { id: g.student, name: g.student_name, email: g.student_email, subjects: {} };
      const subKey = g.component ? `${g.subject}__${g.component}` : `${g.subject}`;
      if (!sMap[key].subjects[subKey]) sMap[key].subjects[subKey] = {};
      if (g.grade_type === 'final_grade') {
        sMap[key].subjects[subKey] = { score: g.raw_score, percentage: g.percentage, remark: g.computed_remarks };
      } else if (!sMap[key].subjects[subKey].score) {
        sMap[key].subjects[subKey] = { score: g.raw_score, percentage: g.percentage, remark: g.computed_remarks };
      }
      subMap[subKey] = { id: g.subject, name: g.subject_name, code: g.subject_code, component: g.component || '' };
    }
    return { studentMap: sMap, subjects: subMap, subjectIds: Object.keys(subMap) };
  }, [grades]);

  const filteredStudents = useMemo(() => {
    const list = Object.values(studentMap);
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(s => s.name.toLowerCase().includes(q));
  }, [studentMap, search]);

  const selectedClassroomObj = classrooms.find(c => c.id === parseInt(selectedClassroom));

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    if (!filteredStudents.length) return;
    const headers = ['Student', ...subjectIds.map(s => subjects[s].name + (subjects[s].component ? ` (${subjects[s].component})` : '')), 'Average'];
    const rows = filteredStudents.map(s => {
      const scores = subjectIds.map(sub => s.subjects[sub]?.score ?? '');
      const avg = scores.filter(x => x !== '').length
        ? (scores.filter(x => x !== '').reduce((a, b) => a + parseFloat(b), 0) / scores.filter(x => x !== '').length).toFixed(2)
        : '';
      return [s.name, ...scores, avg];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `master-sheet-${selectedClassroomObj?.name || 'class'}-Q${selectedQuarter}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Master Sheet</h2>
          <p className="text-sm text-gray-500">All students and their final grades across subjects</p>
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
          <p className="text-sm text-gray-500">Select a classroom to view the master sheet</p>
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
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                    Student Name
                  </th>
                  {subjectIds.map(sub => (
                    <th key={sub} className="px-3 py-3 text-center font-semibold text-gray-700 min-w-[100px]">
                      <div>{subjects[sub].code || subjects[sub].name}</div>
                      {subjects[sub].component && (
                        <div className="text-[10px] text-gray-400 font-normal">{subjects[sub].component}</div>
                      )}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 bg-gray-100 min-w-[90px]">
                    Average
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const scores = subjectIds.map(sub => student.subjects[sub]?.score).filter(s => s !== null && s !== undefined);
                  const avg = scores.length ? (scores.reduce((a, b) => a + parseFloat(b), 0) / scores.length).toFixed(2) : null;
                  return (
                    <tr key={student.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-900 sticky left-0 z-10" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <div>{student.name}</div>
                        {student.email && <div className="text-[10px] text-gray-400">{student.email}</div>}
                      </td>
                      {subjectIds.map(sub => {
                        const score = student.subjects[sub]?.score;
                        return (
                          <td key={sub} className="px-3 py-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${getGradeColor(score)}`}>
                              {score !== null && score !== undefined ? parseFloat(score).toFixed(2) : '-'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center bg-gray-50">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${getGradeColor(avg)}`}>
                          {avg !== null ? parseFloat(avg).toFixed(2) : '-'}
                        </span>
                        {avg !== null && (
                          <div className="text-[10px] text-gray-400 mt-0.5">{getRemark(avg)}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>{filteredStudents.length} students · {subjectIds.length} subjects</span>
            <span>{selectedClassroomObj?.name} · Term {selectedQuarter} · {academicYear}</span>
          </div>
        </div>
      )}
    </div>
  );
}
