import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useSystemSettings } from '../hooks/useSystemSettings';
import {
  ExportProgress,
  downloadFromAPI,
  generateExportFilename,
  handleExportError,
} from '../utils/exportHelpers';

function SF1Page() {
  const { activeYear } = useAcademicYear();
  const { settings } = useSystemSettings();
  const [filters, setFilters] = useState({
    academic_year: '',
    section: '',
  });
  const [previewMode, setPreviewMode] = useState(false);

  const { data: filterOptions } = useQuery({
    queryKey: ['sf1-filters'],
    queryFn: async () => {
      const res = await api.get('/sf1/filters/');
      return res.data;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sf1', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/sf1/?${params.toString()}`);
      return res.data;
    },
    enabled: !!filters.academic_year,
  });

  const validation = data?.validation;
  const schoolInfo = data?.data?.school_info;
  const classrooms = data?.data?.classrooms || [];
  const firstClassroom = classrooms[0];
  const totalStudents = validation?.total_students || 0;
  const totalMale = validation?.total_male || 0;
  const totalFemale = validation?.total_female || 0;

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportPDF = async () => {
    // Validation
    if (!firstClassroom) {
      toast.error('No classroom selected. Please select an academic year.');
      return;
    }
    
    if (totalStudents === 0) {
      toast.error('No students found in the selected classroom.');
      return;
    }

    const progress = new ExportProgress(2, 'Preparing SF1 School Register PDF');
    
    try {
      progress.update(1, 'Generating PDF from server');
      
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      
      const filename = generateExportFilename(
        `SF1_${firstClassroom?.classroom?.grade_level || 'Grade'}_${firstClassroom?.classroom?.section || 'Section'}`,
        'pdf',
        { includeDate: true }
      );
      
      await downloadFromAPI(
        api,
        '/sf1/export/pdf/',
        filename,
        {
          method: 'post',
          params,
          responseType: 'blob',
        }
      );
      
      progress.complete('SF1 School Register PDF exported successfully!');
      
    } catch (error) {
      handleExportError(error, 'PDF Export');
    }
  };

  const handleExportExcel = async () => {
    // Validation
    if (!firstClassroom) {
      toast.error('No classroom selected. Please select an academic year.');
      return;
    }
    
    if (totalStudents === 0) {
      toast.error('No students found in the selected classroom.');
      return;
    }

    const progress = new ExportProgress(2, 'Preparing SF1 School Register Excel');
    
    try {
      progress.update(1, 'Generating Excel from server');
      
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      
      const filename = generateExportFilename(
        `SF1_${firstClassroom?.classroom?.grade_level || 'Grade'}_${firstClassroom?.classroom?.section || 'Section'}`,
        'xlsx',
        { includeDate: true }
      );
      
      await downloadFromAPI(
        api,
        '/sf1/export/excel/',
        filename,
        {
          method: 'post',
          params,
          responseType: 'blob',
        }
      );
      
      progress.complete('SF1 School Register Excel exported successfully!');
      
    } catch (error) {
      handleExportError(error, 'Excel Export');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const genderSeparatedStudents = useMemo(() => {
    if (!firstClassroom) return { males: [], females: [] };
    return {
      males: firstClassroom.male_students || [],
      females: firstClassroom.female_students || [],
    };
  }, [firstClassroom]);

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            School Form 1 (SF1) - School Register
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Official DepEd class register with enrolled students
            {activeYear && <span className="ml-2">• SY {activeYear.name}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? 'List View' : 'Preview'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>Print</Button>
          <Button variant="secondary" size="sm" onClick={handleExportPDF}>Download PDF</Button>
          <Button variant="primary" size="sm" onClick={handleExportExcel}>Download Excel</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Academic Year</label>
              <select
                value={filters.academic_year}
                onChange={e => handleFilterChange('academic_year', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                <option value="">Select Year</option>
                {filterOptions?.academic_years?.map(ay => (
                  <option key={ay.id} value={ay.id}>{ay.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Section</label>
              <select
                value={filters.section}
                onChange={e => handleFilterChange('section', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                <option value="">All Sections</option>
                {filterOptions?.sections?.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => refetch()} size="sm">Generate SF1</Button>
              <Button variant="ghost" size="sm" onClick={() => setFilters({ academic_year: '', section: '' })}>Reset</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Statistics */}
      {validation && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-extrabold text-slate-900">{totalStudents}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Students</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-extrabold text-blue-600">{totalMale}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Male Students</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-extrabold text-pink-600">{totalFemale}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Female Students</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-extrabold text-violet-600">{classrooms.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sections</p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Validation Warnings */}
      {validation && (validation.warnings?.length > 0 || validation.student_warnings?.length > 0 || validation.errors?.length > 0) && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardBody>
            <h3 className="text-sm font-bold text-amber-800 mb-2">Validation Checklist</h3>
            {validation.errors?.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-red-700 mb-1">
                <span className="text-red-500 mt-0.5">❌</span> {err}
              </div>
            ))}
            {validation.warnings?.map((warn, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-700 mb-1">
                <span className="text-amber-500 mt-0.5">⚠️</span> {warn}
              </div>
            ))}
            {validation.student_warnings?.slice(0, 10).map((sw, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-700 mb-1">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <span><strong>{sw.student}</strong> {sw.lrn ? `(LRN: ${sw.lrn})` : ''}: {sw.warnings.join(', ')}</span>
              </div>
            ))}
            {validation.student_warnings?.length > 10 && (
              <p className="text-xs text-amber-600 mt-1">...and {validation.student_warnings.length - 10} more students with warnings</p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-slate-500">Generating SF1...</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && classrooms.length === 0 && (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Data Found</h3>
              <p className="text-sm text-slate-500">Select an academic year and click Generate SF1 to create the school register.</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* SF1 Preview */}
      {!isLoading && firstClassroom && previewMode && (
        <div className="print:shadow-none" id="sf1-preview">
          {classrooms.map((classroomData, idx) => (
            <SF1PrintPreview
              key={idx}
              data={classroomData}
              schoolInfo={schoolInfo || {}}
              schoolHead={data?.data?.school_head_name || ''}
              generatedDate={data?.data?.generated_date || ''}
              settings={settings}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && firstClassroom && !previewMode && (
        <div className="space-y-6">
          {classrooms.map((classroomData, idx) => {
            const classroom = classroomData.classroom;
            const allStudents = [
              ...classroomData.male_students.map(s => ({ ...s, gender: 'Male' })),
              ...classroomData.female_students.map(s => ({ ...s, gender: 'Female' })),
            ];
            return (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Grade {classroom.grade_level} - {classroom.section}
                      </h3>
                      <p className="text-xs text-slate-500">Adviser: {classroom.adviser || 'Not assigned'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge color="blue">{classroomData.total_male} Male</Badge>
                      <Badge color="pink">{classroomData.total_female} Female</Badge>
                      <Badge color="violet">{classroomData.total_combined} Total</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2 text-left font-bold text-slate-500">#</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-500">LRN</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-500">Name</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-500">Sex</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-500">Birthdate</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-500">Age</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-500">Barangay</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-500">Father</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-500">Mother</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-500">Contact</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-500">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allStudents.map((student, i) => (
                          <tr key={i} className={`border-b border-slate-100 ${student.gender === 'Male' ? 'bg-blue-50/30' : 'bg-pink-50/30'}`}>
                            <td className="px-3 py-1.5">{student.no}</td>
                            <td className="px-3 py-1.5 font-mono text-[10px]">{student.lrn}</td>
                            <td className="px-3 py-1.5 font-semibold">{student.name}</td>
                            <td className="px-3 py-1.5">{student.sex}</td>
                            <td className="px-3 py-1.5">{student.birthdate ? new Date(student.birthdate).toLocaleDateString() : ''}</td>
                            <td className="px-3 py-1.5">{student.age}</td>
                            <td className="px-3 py-1.5">{student.barangay}</td>
                            <td className="px-3 py-1.5">{student.father_name}</td>
                            <td className="px-3 py-1.5">{student.mother_name}</td>
                            <td className="px-3 py-1.5">{student.contact_number}</td>
                            <td className="px-3 py-1.5">
                              {student.remarks && <Badge color="amber" size="sm">{student.remarks}</Badge>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
                <CardFooter>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Male: {classroomData.total_male}</span>
                    <span>Female: {classroomData.total_female}</span>
                    <span>Total: {classroomData.total_combined}</span>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SF1PrintPreview({ data, schoolInfo, schoolHead, generatedDate, settings }) {
  const classroom = data.classroom;
  const { males, females } = {
    males: data.male_students || [],
    females: data.female_students || [],
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 print:border-0 print:rounded-none print:p-2 print:shadow-none">
      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:p-2 { padding: 0.5rem !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-extrabold">School Form 1 (SF 1) School Register</h1>
        <p className="text-[10px] text-slate-500 italic">(This replaces Form 1 Master List & SF1-Form 2-Family Background and Profile)</p>
      </div>

      {/* School Info Header */}
      <div className="border border-slate-800 mb-4 text-xs">
        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-2 border-r border-b border-slate-800 px-2 py-1 font-bold bg-slate-50">School ID</div>
          <div className="col-span-2 border-r border-b border-slate-800 px-2 py-1">{schoolInfo.school_id || settings?.school_id || ''}</div>
          <div className="col-span-1 border-r border-b border-slate-800 px-2 py-1 font-bold bg-slate-50">Region</div>
          <div className="col-span-3 border-r border-b border-slate-800 px-2 py-1">{schoolInfo.region || settings?.region || ''}</div>
          <div className="col-span-1 border-r border-b border-slate-800 px-2 py-1 font-bold bg-slate-50">Division</div>
          <div className="col-span-3 border-b border-slate-800 px-2 py-1">{schoolInfo.division || settings?.division || ''}</div>
        </div>
        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-2 border-r border-b border-slate-800 px-2 py-1 font-bold bg-slate-50">School Name</div>
          <div className="col-span-10 border-b border-slate-800 px-2 py-1">{schoolInfo.school_name || settings?.site_name || ''}</div>
        </div>
        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-2 border-r border-slate-800 px-2 py-1 font-bold bg-slate-50">School Year</div>
          <div className="col-span-3 border-r border-slate-800 px-2 py-1">{classroom.academic_year}</div>
          <div className="col-span-2 border-r border-slate-800 px-2 py-1 font-bold bg-slate-50">Grade Level</div>
          <div className="col-span-2 border-r border-slate-800 px-2 py-1">{classroom.grade_level}</div>
          <div className="col-span-1 border-r border-slate-800 px-2 py-1 font-bold bg-slate-50">Section</div>
          <div className="col-span-2 px-2 py-1 font-bold">{classroom.section}</div>
        </div>
      </div>

      {/* Register Table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse border border-slate-800 text-[8px]">
          <thead>
            <tr className="bg-slate-100">
              {['No.', 'LRN', 'NAME (Last Name, First Name, Middle Name)', 'SEX', 'BIRTH DATE', 'AGE', 'MOTHER TONGUE', 'IP', 'RELIGION', 'HOUSE #/STREET', 'BARANGAY', 'CITY/MUNI', 'PROVINCE', "FATHER'S NAME", "MOTHER'S NAME", 'GUARDIAN', 'REL.', 'CONTACT', 'MODALITY', 'REMARKS'].map(h => (
                <th key={h} className="border border-slate-800 px-1 py-1 text-center font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {males.map((s, i) => (
              <tr key={`m${i}`} className="bg-blue-50/50">
                <td className="border border-slate-800 px-1 text-center">{s.no}</td>
                <td className="border border-slate-800 px-1 font-mono">{s.lrn}</td>
                <td className="border border-slate-800 px-1 font-semibold">{s.name}</td>
                <td className="border border-slate-800 px-1 text-center">{s.sex}</td>
                <td className="border border-slate-800 px-1 text-center">{s.birthdate ? new Date(s.birthdate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}</td>
                <td className="border border-slate-800 px-1 text-center">{s.age}</td>
                <td className="border border-slate-800 px-1">{s.mother_tongue}</td>
                <td className="border border-slate-800 px-1">{s.indigenous_people}</td>
                <td className="border border-slate-800 px-1">{s.religion}</td>
                <td className="border border-slate-800 px-1">{s.house_number}</td>
                <td className="border border-slate-800 px-1">{s.barangay}</td>
                <td className="border border-slate-800 px-1">{s.city_municipality}</td>
                <td className="border border-slate-800 px-1">{s.province}</td>
                <td className="border border-slate-800 px-1">{s.father_name}</td>
                <td className="border border-slate-800 px-1">{s.mother_name}</td>
                <td className="border border-slate-800 px-1">{s.guardian_name}</td>
                <td className="border border-slate-800 px-1">{s.guardian_relationship}</td>
                <td className="border border-slate-800 px-1">{s.contact_number}</td>
                <td className="border border-slate-800 px-1">{s.learning_modality}</td>
                <td className="border border-slate-800 px-1">{s.remarks}</td>
              </tr>
            ))}
            <tr className="bg-green-100 font-bold">
              <td colSpan={20} className="border border-slate-800 px-2">{data.total_male} .... TOTAL MALE</td>
            </tr>
            {females.map((s, i) => (
              <tr key={`f${i}`} className="bg-pink-50/50">
                <td className="border border-slate-800 px-1 text-center">{s.no}</td>
                <td className="border border-slate-800 px-1 font-mono">{s.lrn}</td>
                <td className="border border-slate-800 px-1 font-semibold">{s.name}</td>
                <td className="border border-slate-800 px-1 text-center">{s.sex}</td>
                <td className="border border-slate-800 px-1 text-center">{s.birthdate ? new Date(s.birthdate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}</td>
                <td className="border border-slate-800 px-1 text-center">{s.age}</td>
                <td className="border border-slate-800 px-1">{s.mother_tongue}</td>
                <td className="border border-slate-800 px-1">{s.indigenous_people}</td>
                <td className="border border-slate-800 px-1">{s.religion}</td>
                <td className="border border-slate-800 px-1">{s.house_number}</td>
                <td className="border border-slate-800 px-1">{s.barangay}</td>
                <td className="border border-slate-800 px-1">{s.city_municipality}</td>
                <td className="border border-slate-800 px-1">{s.province}</td>
                <td className="border border-slate-800 px-1">{s.father_name}</td>
                <td className="border border-slate-800 px-1">{s.mother_name}</td>
                <td className="border border-slate-800 px-1">{s.guardian_name}</td>
                <td className="border border-slate-800 px-1">{s.guardian_relationship}</td>
                <td className="border border-slate-800 px-1">{s.contact_number}</td>
                <td className="border border-slate-800 px-1">{s.learning_modality}</td>
                <td className="border border-slate-800 px-1">{s.remarks}</td>
              </tr>
            ))}
            <tr className="bg-green-100 font-bold">
              <td colSpan={20} className="border border-slate-800 px-2">{data.total_female} .... TOTAL FEMALE</td>
            </tr>
            <tr className="bg-green-200 font-extrabold">
              <td colSpan={20} className="border border-slate-800 px-2">{data.total_combined} .... COMBINED</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Remarks Legend */}
      <div className="border border-slate-800 text-[8px] mb-4">
        <div className="bg-slate-100 px-2 py-1 font-bold border-b border-slate-800">List and Code of Indicators under REMARKS column</div>
        <div className="grid grid-cols-2 gap-0">
          <div className="border-r border-slate-800 p-1">
            <div className="font-bold">Transferred Out - TrnO: Name of School & Effectivity Date</div>
            <div className="font-bold">Transferred In - TrnI: Reason and Effectivity Date</div>
            <div className="font-bold">Dropped - DR: Reason (Enrollment beyond 1st Friday)</div>
          </div>
          <div className="p-1">
            <div className="font-bold">CCT Recipient - CCT: CCT Control/Reference number</div>
            <div className="font-bold">Balik-Aral - BA: Name of school last attended</div>
            <div className="font-bold">SNED - SNED: Specify Level & Effectivity Data</div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div className="text-center">
          <p className="text-xs font-bold mb-8">Prepared by:</p>
          <div className="border-t border-slate-800 pt-1">
            <p className="text-xs font-bold">{classroom.adviser}</p>
            <p className="text-[10px] text-slate-500">(Signature of Adviser over Printed Name)</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold mb-8">Certified Correct:</p>
          <div className="border-t border-slate-800 pt-1">
            <p className="text-xs font-bold">{schoolHead || settings?.site_name || ''}</p>
            <p className="text-[10px] text-slate-500">(Signature of School Head over Printed Name)</p>
          </div>
        </div>
      </div>

      <p className="text-[9px] text-slate-400 text-right mt-4 italic">Generated on: {generatedDate}</p>
    </div>
  );
}

export default SF1Page;
