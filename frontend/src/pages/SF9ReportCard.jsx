import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAcademicYear } from '../context/AcademicYearContext';

function SF9Page() {
  const { activeYear } = useAcademicYear();
  const [filters, setFilters] = useState({
    academic_year: activeYear?.id || '',
    student_id: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sf9', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/sf9/?${params.toString()}`);
      return res.data;
    },
    enabled: !!activeYear,
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.post('/sf9/export_pdf/', {}, { params });
      const blob = new Blob([res.data.pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch { }
  };

  const studentInfo = data?.student_info?.student || {};
  const quarterGrades = data?.quarter_grades || {};
  const finalGrades = data?.final_grades || [];
  const attendanceSummary = data?.attendance_summary || {};
  const coreValues = data?.core_values || {};
  const remarks = data?.remarks || {};
  const generalAverage = data?.general_average;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">SF9 - Learner Progress Report Card</h1>
          <p className="text-sm text-slate-500 mt-1">Official report card</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExportPDF}>Export PDF</Button>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Student" value={`${studentInfo.first_name || ''} ${studentInfo.last_name || ''}`} readOnly />
            <Input label="LRN" value={studentInfo.lrn || ''} readOnly />
            <Input label="Grade Level / Section" value={`${studentInfo.grade_level || ''} - ${studentInfo.section || ''}`} readOnly />
          </div>
        </CardBody>
      </Card>

      {isLoading ? (
        <Card><CardBody><div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" /></div></CardBody></Card>
      ) : finalGrades.length > 0 ? (
        <>
          <Card className="mb-6">
            <CardHeader><h3 className="font-bold text-slate-900">Final Grades</h3></CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left font-bold text-slate-700">Subject</th><th className="px-4 py-2 text-left font-bold text-slate-700">Final Grade</th><th className="px-4 py-2 text-left font-bold text-slate-700">Remarks</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {finalGrades.map((fg, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{fg.subject}</td>
                      <td className="px-4 py-2 text-slate-800">{fg.final_grade}</td>
                      <td className="px-4 py-2"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${fg.remarks === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{fg.remarks}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          {generalAverage && (
            <Card className="mb-6">
              <CardBody className="text-center">
                <p className="text-lg font-extrabold text-slate-900">General Average: {generalAverage}</p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><p className="font-bold text-slate-700 mb-1">Attendance</p><p>Present: {attendanceSummary.present || 0} | Absent: {attendanceSummary.absent || 0}</p><p>Rate: {attendanceSummary.attendance_rate || 0}%</p></div>
                <div><p className="font-bold text-slate-700 mb-1">Remarks</p><p>Adviser: {remarks.adviser_name || ''}</p><p>Academic Year: {data?.academic_year || ''}</p></div>
              </div>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card><CardBody><p className="text-center py-8 text-slate-400">No data found. Apply filters and generate.</p></CardBody></Card>
      )}
    </div>
  );
}

export default SF9Page;