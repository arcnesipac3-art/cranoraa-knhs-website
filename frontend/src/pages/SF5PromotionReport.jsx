import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAcademicYear } from '../context/AcademicYearContext';

function SF5Page() {
  const { activeYear } = useAcademicYear();
  const [filters, setFilters] = useState({
    academic_year: activeYear?.id || '',
    grade_level: '',
    section: '',
    adviser: '',
  });
  const [exporting, setExporting] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sf5', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/school-forms/sf5/?${params.toString()}`);
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
      const res = await api.post('/school-forms/sf5/export/pdf/', {}, { params });
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
      const res = await api.post('/school-forms/sf5/export/excel/', {}, { params });
      const blob = new Blob([res.data.excel], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SF5_Promotion_Report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch { } finally { setExporting(null); }
  };

  const classSummary = data?.class_summary || {};

  const promotionColors = {
    Promoted: 'green',
    Retained: 'red',
    Conditional: 'amber',
    'No Data': 'slate',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">SF5 - Promotion and Learning Progress</h1>
          <p className="text-sm text-slate-500 mt-1">Promotion status with class summary</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportPDF} disabled={exporting !== null}>{exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}</Button>
          <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting !== null}>{exporting === 'excel' ? 'Exporting...' : 'Export Excel'}</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Grade Level" value={filters.grade_level} onChange={e => handleFilterChange('grade_level', e.target.value)} placeholder="Filter" />
            <Input label="Section" value={filters.section} onChange={e => handleFilterChange('section', e.target.value)} placeholder="Filter" />
            <div className="flex items-end"><Button onClick={refetch} size="sm">Apply Filters</Button></div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardBody className="text-center"><p className="text-3xl font-extrabold text-emerald-600">{classSummary.promoted || 0}</p><p className="text-xs text-slate-500 mt-1">Promoted</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-3xl font-extrabold text-amber-600">{classSummary.conditional || 0}</p><p className="text-xs text-slate-500 mt-1">Conditional</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-3xl font-extrabold text-red-600">{classSummary.retained || 0}</p><p className="text-xs text-slate-500 mt-1">Retained</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-3xl font-extrabold text-violet-600">{classSummary.class_average || 0}</p><p className="text-xs text-slate-500 mt-1">Class Average</p></CardBody></Card>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Student</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Grade Level</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Section</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">General Average</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.students || []).map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.student?.name}</td>
                      <td className="px-4 py-3 text-slate-600">{s.classroom?.grade_level}</td>
                      <td className="px-4 py-3 text-slate-600">{s.classroom?.section}</td>
                      <td className="px-4 py-3 text-slate-800">{s.promotion_status?.general_average || '-'}</td>
                      <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-${promotionColors[s.promotion_status?.status] || 'slate'}-100 text-${promotionColors[s.promotion_status?.status] || 'slate'}-700`}>{s.promotion_status?.status || 'Unknown'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
        <CardFooter><span className="text-xs text-slate-400">Total: {(data?.students || []).length} students</span></CardFooter>
      </Card>
    </div>
  );
}

export default SF5Page;