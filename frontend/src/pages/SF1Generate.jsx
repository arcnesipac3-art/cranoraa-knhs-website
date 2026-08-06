import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { Button } from '../components/ui';
import toast from 'react-hot-toast';

export default function SF1Generate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState([]);
  const [fetchingClassrooms, setFetchingClassrooms] = useState(false);
  // Fetch school years from backend instead of hardcoding
  const [schoolYears, setSchoolYears] = useState([]);
  const [fetchingYears, setFetchingYears] = useState(true);

  const [form, setForm] = useState({
    academic_year: '',
    grade_level: '',
    section: '',
  });

  const [errors, setErrors] = useState({});

  // Fetch available academic years on mount
  useEffect(() => {
    const fetchYears = async () => {
      setFetchingYears(true);
      try {
        const res = await api.get('/admin/academic-years/');
        const years = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setSchoolYears(years.map(y => y.name).sort().reverse());
      } catch {
        // Fallback to current + next 4 years if endpoint fails
        const current = new Date().getFullYear();
        setSchoolYears(Array.from({ length: 5 }, (_, i) => `${current + i}-${current + i + 1}`));
      } finally {
        setFetchingYears(false);
      }
    };
    fetchYears();
  }, []);

  // Fetch available classrooms when year and grade are selected
  useEffect(() => {
    if (!form.academic_year || !form.grade_level) {
      setClassrooms([]);
      setForm(f => ({ ...f, section: '', classroom_id: '' }));
      return;
    }

    const fetchClassrooms = async () => {
      setFetchingClassrooms(true);
      try {
        const res = await api.get('/classrooms/', {
          params: { academic_year: form.academic_year, grade_level: form.grade_level }
        });
        setClassrooms(res.data.results || res.data || []);
      } catch {
        setClassrooms([]);
      } finally {
        setFetchingClassrooms(false);
      }
    };

    fetchClassrooms();
  }, [form.academic_year, form.grade_level]);

  const gradeLevels = [
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
    'Grade 11', 'Grade 12',
  ];

  const handleChange = (field, value) => {
    if (field === 'grade_level') {
      setForm(f => ({ ...f, grade_level: value, section: '', classroom_id: '' }));
    } else if (field === 'academic_year') {
      setForm(f => ({ ...f, academic_year: value, section: '', classroom_id: '' }));
    } else {
      setForm(f => ({ ...f, [field]: value }));
    }
    setErrors(e => ({ ...e, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.academic_year) errs.academic_year = 'School year is required';
    if (!form.grade_level) errs.grade_level = 'Grade level is required';
    if (!form.classroom_id) errs.section = 'Section is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post('/school-forms/sf1/generate/', {
        academic_year: form.academic_year,
        grade_level: form.grade_level,
        // Send classroom id for reliable section resolution
        section: form.section,
        classroom_id: form.classroom_id,
      });
      toast.success('SF1 generated successfully!');
      navigate(`/school-forms/sf1/${res.data.id}`);
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === 'object' && msg !== null) {
        if (msg.non_field_errors) {
          toast.error(msg.non_field_errors[0]);
        } else if (msg.error) {
          toast.error(msg.error);
        } else {
          const firstKey = Object.keys(msg)[0];
          toast.error(`${firstKey}: ${Array.isArray(msg[firstKey]) ? msg[firstKey][0] : msg[firstKey]}`);
        }
      } else {
        toast.error('Failed to generate SF1');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="page-bottom-safe max-w-2xl mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/school-forms/sf1')}
          className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>School Forms</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Generate SF1</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-[0.2em]">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Select Section</span>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Select the academic year, grade level, and section to generate the School Register.
          Students will be automatically loaded from enrolled records.
        </p>

        {/* School Year */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            School Year *
          </label>
          <select
            value={form.academic_year}
            onChange={(e) => handleChange('academic_year', e.target.value)}
            disabled={fetchingYears}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm font-semibold ${
              errors.academic_year ? 'border-red-300 bg-red-50' : 'border-slate-200'
            } ${fetchingYears ? 'bg-slate-50 text-slate-400' : ''}`}
          >
            <option value="">{fetchingYears ? 'Loading...' : 'Select School Year'}</option>
            {schoolYears.map(sy => <option key={sy} value={sy}>{sy}</option>)}
          </select>
          {errors.academic_year && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errors.academic_year}
            </p>
          )}
        </div>

        {/* Grade Level */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Grade Level *
          </label>
          <select
            value={form.grade_level}
            onChange={(e) => handleChange('grade_level', e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm font-semibold ${
              errors.grade_level ? 'border-red-300 bg-red-50' : 'border-slate-200'
            }`}
          >
            <option value="">Select Grade Level</option>
            {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
          </select>
          {errors.grade_level && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errors.grade_level}
            </p>
          )}
        </div>

        {/* Section */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Section *
          </label>
          {fetchingClassrooms ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading sections...
            </div>
          ) : (
            <select
              value={form.section}
              onChange={(e) => {
                const selectedClassroom = classrooms.find(c => c.name === e.target.value);
                setForm(f => ({
                  ...f,
                  section: e.target.value,
                  classroom_id: selectedClassroom ? String(selectedClassroom.id) : '',
                }));
                setErrors(err => ({ ...err, section: null }));
              }}
              disabled={!form.academic_year || !form.grade_level}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm font-semibold ${
                errors.section ? 'border-red-300 bg-red-50' : 'border-slate-200'
              } ${!form.academic_year || !form.grade_level ? 'bg-slate-50 text-slate-400' : ''}`}
            >
              <option value="">
                {!form.academic_year || !form.grade_level
                  ? 'Select school year and grade first'
                  : classrooms.length === 0
                    ? 'No sections found'
                    : 'Select Section'
                }
              </option>
              {classrooms.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.teacher_name || 'No adviser'}) — {c.student_count ?? c.enrollment_count ?? 0} students
                </option>
              ))}
            </select>
          )}
          {errors.section && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errors.section}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/school-forms/sf1')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !form.academic_year || !form.grade_level || !form.classroom_id}
            className="inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate SF1'
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
