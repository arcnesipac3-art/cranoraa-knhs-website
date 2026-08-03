import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Download, Loader2, BookOpen,
} from 'lucide-react';
import api from '../utils/api';
import { Skeleton, Button } from '../components/ui';
import toast from 'react-hot-toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SF2Dashboard() {
  const [classrooms, setClassrooms] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [formData, setFormData] = useState({
    academic_year: '',
    grade_level: '',
    section: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    setLoadingClasses(true);
    try {
      const res = await api.get('/classrooms/', { params: { page_size: 1000 } });
      setClassrooms(res.data.results || res.data);
    } catch {
      toast.error('Failed to load classrooms');
    } finally {
      setLoadingClasses(false);
    }
  };

  const gradeLevels = [...new Set(classrooms.map(c => c.grade_level))].sort();
  const sections = classrooms
    .filter(c => !formData.grade_level || c.grade_level === formData.grade_level)
    .map(c => c.section)
    .sort();
  const schoolYears = [...new Set(classrooms.map(c => c.academic_year))].sort().reverse();

  const handleFieldChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'grade_level') {
        next.section = '';
      }
      return next;
    });
  };

  const canGenerate = formData.academic_year && formData.grade_level && formData.section && formData.month && formData.year;

  const handleExport = async (type) => {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const params = {
        academic_year: formData.academic_year,
        grade_level: formData.grade_level,
        section: formData.section,
        month: formData.month,
        year: formData.year,
      };
      const endpoint = type === 'pdf' ? '/sf2/export_pdf/' : '/sf2/export_excel/';
      const res = await api.get(endpoint, {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `SF2_${formData.academic_year}_${formData.grade_level}_${formData.section}_${MONTHS[formData.month - 1]}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} exported successfully`);
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to export ${type.toUpperCase()}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span>School Forms</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          School Form 2 (SF2)
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-semibold">
          Daily Attendance Report of Learners
        </p>
      </div>

      {/* Selection Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Generate Attendance Report</h2>
        {loadingClasses ? (
          <Skeleton.Form />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* School Year */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">School Year</label>
              <select
                value={formData.academic_year}
                onChange={(e) => handleFieldChange('academic_year', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Select School Year</option>
                {schoolYears.map(sy => <option key={sy} value={sy}>{sy}</option>)}
              </select>
            </div>

            {/* Grade Level */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Grade Level</label>
              <select
                value={formData.grade_level}
                onChange={(e) => handleFieldChange('grade_level', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Select Grade Level</option>
                {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Section</label>
              <select
                value={formData.section}
                onChange={(e) => handleFieldChange('section', e.target.value)}
                disabled={!formData.grade_level}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">Select Section</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Month</label>
              <select
                value={formData.month}
                onChange={(e) => handleFieldChange('month', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Year</label>
              <select
                value={formData.year}
                onChange={(e) => handleFieldChange('year', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                {[formData.year - 1, formData.year, formData.year + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Export Buttons */}
            <div className="flex items-end gap-2">
              <Button
                onClick={() => handleExport('pdf')}
                disabled={!canGenerate || generating}
                className="flex-1"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleExport('excel')}
                disabled={!canGenerate || generating}
                className="flex-1"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export Excel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-blue-800 mb-2">About SF2</h3>
        <p className="text-xs text-blue-700 leading-relaxed">
          School Form 2 (Daily Attendance Report of Learners) is generated on-the-fly from existing attendance records.
          Select a class section, month, and year to generate the report. The report shows daily attendance (P/A/L/E)
          for each learner and summary statistics. Export as PDF or Excel for printing.
        </p>
      </div>
    </motion.div>
  );
}
