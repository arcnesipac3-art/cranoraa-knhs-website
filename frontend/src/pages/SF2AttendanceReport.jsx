import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAcademicYear } from '../context/AcademicYearContext';

function SF2Page() {
  const { activeYear } = useAcademicYear();
  const [filters, setFilters] = useState({
    academic_year: activeYear?.id || '',
    grade_level: '',
    section: '',
    adviser: '',
    start_date: '',
    end_date: '',
    report_type: 'daily',
  });
  const [exporting, setExporting] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sf2', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/sf2/?${params.toString()}`);
      return res.data;
    },
    enabled: !!activeYear,
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportPDF = async () => {
    try {
      setExporting('pdf');
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.post('/sf2/export_pdf/', {}, { params });
      const blob = new Blob([res.data.pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch { } finally { setExporting(null); }
  };

  const handleExportExcel = async () => {
    try {
      setExporting('excel');
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.post('/sf2/export/excel/', {}, { params });
      const blob = new Blob([res.data.excel], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SF2_Attendance_Report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch { } finally { setExporting(null); }
  };

  const summary = data?.summary || {};
  const matrix = data?.matrix || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">SF2 - Daily Attendance Report</h1>
          <p className="text-sm text-slate-500 mt-1">Attendance sheets with summaries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportPDF} disabled={exporting !== null}>{exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}</Button>
          <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting !== null}>{exporting === 'excel' ? 'Exporting...' : 'Export Excel'}</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Input label="Start Date" type="date" value={filters.start_date} onChange={e => handleFilterChange('start_date', e.target.value)} />
            <Input label="End Date" type="date" value={filters.end_date} onChange={e => handleFilterChange('end_date', e.target.value)} />
            <Select label="Report Type" value={filters.report_type} onChange={e => handleFilterChange('report_type', e.target.value)} options={[{ value: 'daily', label: 'Daily' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }]} />
            <Input label="Grade Level" value={filters.grade_level} onChange={e => handleFilterChange('grade_level', e.target.value)} placeholder="Filter" />
            <Input label="Section" value={filters.section} onChange={e => handleFilterChange('section', e.target.value)} placeholder="Filter" />
            <div className="flex items-end"><Button onClick={refetch} size="sm">Apply</Button></div>
          </div>
        </CardBody>
      </Card>

      {isLoading ? (
        <Card><CardBody><div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" /></div></CardBody></Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader><h3 className="font-bold text-slate-900">Summary</h3></CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                <div className="text-center"><p className="text-2xl font-extrabold text-slate-900">{summary.total_students || 0}</p><p className="text-xs text-slate-500">Students</p></div>
                <div className="text-center"><p className="text-2xl font-extrabold text-emerald-600">{summary.present || 0}</p><p className="text-xs text-slate-500">Present</p></div>
                <div className="text-center"><p className="text-2xl font-extrabold text-red-600">{summary.absent || 0}</p><p className="text-xs text-slate-500">Absent</p></div>
                <div className="text-center"><p className="text-2xl font-extrabold text-amber-600">{summary.late || 0}</p><p className="text-xs text-slate-500">Late</p></div>
                <div className="text-center"><p className="text-2xl font-extrabold text-slate-600">{summary.excused || 0}</p><p className="text-xs text-slate-500">Excused</p></div>
                <div className="text-center"><p className="text-2xl font-extrabold text-violet-600">{summary.attendance_rate || 0}%</p><p className="text-xs text-slate-500">Rate</p></div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-0">
              {matrix.students && matrix.students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-slate-700">Student</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-700">LRN</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-700">Present</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-700">Absent</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-700">Late</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-700">Excused</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.student_summaries?.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
                          <td className="px-3 py-2 text-slate-500">{s.student_id}</td>
                          <td className="px-3 py-2 text-emerald-600 font-semibold">{s.present}</td>
                          <td className="px-3 py-2 text-red-600 font-semibold">{s.absent}</td>
                          <td className="px-3 py-2 text-amber-600 font-semibold">{s.late}</td>
                          <td className="px-3 py-2 text-slate-500">{s.excused}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">No attendance data</div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

export default SF2Page;