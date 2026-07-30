import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { useAcademicYear } from '../context/AcademicYearContext';
import { ExportMenu } from '../components/ExportMenu';

function SF1Page() {
  const { activeYear } = useAcademicYear();
  const [filters, setFilters] = useState({
    academic_year: activeYear?.id || '',
    grade_level: '',
    section: '',
    adviser: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sf1', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/school-forms/sf1/?${params.toString()}`);
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
      const res = await api.post('/school-forms/sf1/export/pdf/', {}, { params });
      const blob = new Blob([res.data.pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch { }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.post('/school-forms/sf1/export/excel/', {}, { params });
      const blob = new Blob([res.data.excel], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SF1_School_Register.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { }
  };

  const rows = (data?.data || []).flatMap(classroom =>
    classroom.students?.map(s => ({
      key: `${classroom.classroom.id}-${s.no}`,
      no: s.no,
      lrn: s.lrn,
      name: s.name,
      sex: s.sex,
      age: s.age,
      gradeLevel: s.grade_level,
      section: s.section,
      adviser: s.adviser,
      status: s.enrollment_status,
    })) || []
  );

  const columns = [
    { key: 'no', label: '#' },
    { key: 'lrn', label: 'LRN' },
    { key: 'name', label: 'Student Name' },
    { key: 'sex', label: 'Sex' },
    { key: 'age', label: 'Age' },
    { key: 'gradeLevel', label: 'Grade Level' },
    { key: 'section', label: 'Section' },
    { key: 'adviser', label: 'Adviser' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">SF1 - School Register</h1>
          <p className="text-sm text-slate-500 mt-1">Class register with enrolled students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportPDF}>Export PDF</Button>
          <Button variant="secondary" size="sm" onClick={handleExportExcel}>Export Excel</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Grade Level"
              value={filters.grade_level}
              onChange={e => handleFilterChange('grade_level', e.target.value)}
              placeholder="Filter by grade level"
            />
            <Input
              label="Section"
              value={filters.section}
              onChange={e => handleFilterChange('section', e.target.value)}
              placeholder="Filter by section"
            />
            <Input
              label="Adviser"
              value={filters.adviser}
              onChange={e => handleFilterChange('adviser', e.target.value)}
              placeholder="Filter by adviser"
            />
            <div className="flex items-end gap-2">
              <Button onClick={refetch} size="sm">Apply Filters</Button>
              <Button variant="ghost" size="sm" onClick={() => setFilters({
                academic_year: activeYear?.id || '', grade_level: '', section: '', adviser: '',
              })}>Reset</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {isLoading ? (
        <Card><CardBody><div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" /></div></CardBody></Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <DataTable columns={columns} data={rows} emptyTitle="No students found" />
          </CardBody>
          <CardFooter>
            <span className="text-xs text-slate-400">Total: {rows.length} students</span>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

export default SF1Page;