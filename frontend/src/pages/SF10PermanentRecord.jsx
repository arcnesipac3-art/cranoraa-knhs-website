import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAcademicYear } from '../context/AcademicYearContext';

function SF10Page() {
  const { activeYear } = useAcademicYear();
  const [filters, setFilters] = useState({
    student_id: '',
    academic_year: activeYear?.id || '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sf10', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/sf10/?${params.toString()}`);
      return res.data;
    },
    enabled: !!filters.student_id,
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportPDF = async () => {
    try {
      const res = await api.post('/sf10/export_pdf/', {}, { params: new URLSearchParams(Object.entries(filters).filter(([, v]) => v)) });
      const blob = new Blob([res.data.pdf], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch { }
  };

  const handleExportExcel = async () => {
    try {
      const res = await api.post('/sf10/export_excel/', {}, { params: new URLSearchParams(Object.entries(filters).filter(([, v]) => v)) });
      const blob = new Blob([res.data.excel], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'SF10_Permanent_Record.xlsx';
      a.click();
    } catch { }
  };

  const studentInfo = data?.student_info?.student || {};
  const promotionHistory = data?.promotion_history || [];
  const enrollmentHistory = data?.enrollment_history || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">SF10 - Permanent Academic Record</h1>
          <p className="text-sm text-slate-500 mt-1">Complete academic history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportPDF}>Export PDF</Button>
          <Button variant="secondary" size="sm" onClick={handleExportExcel}>Export Excel</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Student Name" value={`${studentInfo.first_name || ''} ${studentInfo.last_name || ''}`} readOnly />
            <Input label="LRN" value={studentInfo.lrn || ''} readOnly />
            <Input label="Student ID" value={filters.student_id} onChange={e => handleFilterChange('student_id', e.target.value)} placeholder="Enter student ID" />
          </div>
        </CardBody>
      </Card>

      {isLoading ? (
        <Card><CardBody><div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" /></div></CardBody></Card>
      ) : promotionHistory.length > 0 ? (
        <>
          <Card className="mb-6">
            <CardHeader><h3 className="font-bold text-slate-900">Student Information</h3></CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <p><span className="font-bold text-slate-700">Name:</span> {studentInfo.first_name} {studentInfo.last_name}</p>
                <p><span className="font-bold text-slate-700">LRN:</span> {studentInfo.lrn}</p>
                <p><span className="font-bold text-slate-700">Age:</span> {studentInfo.age || '-'}</p>
              </div>
            </CardBody>
          </Card>

          <Card className="mb-6">
            <CardHeader><h3 className="font-bold text-slate-900">Promotion History</h3></CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left font-bold text-slate-700">Academic Year</th><th className="px-4 py-2 text-left font-bold text-slate-700">Grade Level</th><th className="px-4 py-2 text-left font-bold text-slate-700">Section</th><th className="px-4 py-2 text-left font-bold text-slate-700">GPA</th><th className="px-4 py-2 text-left font-bold text-slate-700">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {promotionHistory.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{h.academic_year}</td>
                      <td className="px-4 py-2 text-slate-600">{h.grade_level}</td>
                      <td className="px-4 py-2 text-slate-600">{h.section}</td>
                      <td className="px-4 py-2 text-slate-800">{h.gpa}</td>
                      <td className="px-4 py-2"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${h.promotion_status === 'Promoted' ? 'bg-green-100 text-green-700' : h.promotion_status === 'Retained' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{h.promotion_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          {enrollmentHistory.length > 0 && (
            <Card>
              <CardHeader><h3 className="font-bold text-slate-900">Enrollment History</h3></CardHeader>
              <CardBody className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left font-bold text-slate-700">Academic Year</th><th className="px-4 py-2 text-left font-bold text-slate-700">Grade Level</th><th className="px-4 py-2 text-left font-bold text-slate-700">Section</th><th className="px-4 py-2 text-left font-bold text-slate-700">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrollmentHistory.map((e, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-800">{e.academic_year}</td>
                        <td className="px-4 py-2 text-slate-600">{e.grade_level}</td>
                        <td className="px-4 py-2 text-slate-600">{e.section}</td>
                        <td className="px-4 py-2 text-slate-600">{e.enrollment_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </>
      ) : (
        <Card><CardBody><p className="text-center py-8 text-slate-400">Enter a student ID to view their permanent record.</p></CardBody></Card>
      )}
    </div>
  );
}

export default SF10Page;