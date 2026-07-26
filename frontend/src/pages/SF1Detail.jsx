import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Download, Printer, RefreshCw, CheckCircle2, Archive,
  BookOpen, Users, User, GraduationCap, FileText,
} from 'lucide-react';
import api from '../utils/api';
import Swal from 'sweetalert2';
import { LoadingSpinner, Button } from '../components/ui';
import toast from 'react-hot-toast';

function revokeUrlSafe(url) {
  try { window.URL.revokeObjectURL(url); } catch { /* ignore */ }
}

export default function SF1Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sf1, setSf1] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const fetchSF1 = async () => {
      try {
        const res = await api.get(`/sf1/${id}/`);
        setSf1(res.data);
      } catch {
        toast.error('Failed to load SF1 details');
        navigate('/sf1');
      } finally {
        setLoading(false);
      }
    };
    fetchSF1();
  }, [id, navigate]);

  const handleExport = async (type) => {
    setActionLoading(type);
    let url = null;
    try {
      const res = await api.get(`/sf1/${id}/export_${type}/`, { responseType: 'blob' });
      const mimeType = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const ext = type === 'excel' ? 'xlsx' : 'pdf';
      url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `SF1_${sf1.school_year}_${sf1.grade_level}_${sf1.section}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`${type === 'excel' ? 'Excel' : 'PDF'} exported successfully`);
    } catch (err) {
      console.error('[SF1Detail] export error:', err);
      toast.error(`Failed to export ${type === 'excel' ? 'Excel' : 'PDF'}`);
    } finally {
      setActionLoading(null);
      if (url) revokeUrlSafe(url);
    }
  };

  const handlePrint = async () => {
    setActionLoading('print');
    let url = null;
    try {
      const res = await api.get(`/sf1/${id}/print_view/`, { responseType: 'blob' });
      url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const win = window.open(url, '_blank');
      if (!win) toast.error('Popup blocked — allow popups for this site to print.');
    } catch (err) {
      console.error('[SF1Detail] print error:', err);
      toast.error('Failed to open print view');
    } finally {
      setActionLoading(null);
      if (url) setTimeout(() => revokeUrlSafe(url), 30000);
    }
  };

  const handleRegenerate = async () => {
    // Use Swal instead of window.confirm (fix: consistent UX, blocks keyboard trap)
    const result = await Swal.fire({
      title: 'Regenerate SF1?',
      text: 'This will create a new version with the current enrollment data. The existing record will be updated.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Regenerate',
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    setActionLoading('regenerate');
    try {
      const res = await api.post(`/sf1/${id}/regenerate/`);
      setSf1(res.data);
      toast.success('SF1 regenerated successfully');
    } catch (err) {
      console.error('[SF1Detail] regenerate error:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to regenerate';
      toast.error(msg, { duration: 6000 });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setActionLoading('status');
    try {
      const res = await api.put(`/sf1/${id}/update_status/`, { status: newStatus });
      setSf1(res.data);
      toast.success(`SF1 marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <LoadingSpinner />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading SF1...</p>
      </div>
    );
  }

  if (!sf1) return null;

  const students = sf1.students || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/sf1')}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>School Form 1</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {sf1.grade_level} — {sf1.section}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              School Year: {sf1.school_year} | Status: {sf1.status ? (sf1.status.charAt(0).toUpperCase() + sf1.status.slice(1)) : '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleRegenerate}
            disabled={!!actionLoading}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading === 'regenerate' ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('pdf')}
            disabled={!!actionLoading}
            className="inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('excel')}
            disabled={!!actionLoading}
            className="inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Excel
          </Button>
          <Button
            variant="secondary"
            onClick={handlePrint}
            disabled={!!actionLoading}
            className="inline-flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
          {sf1.status === 'draft' && (
            <Button
              onClick={() => handleStatusChange('final')}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalize
            </Button>
          )}
          {sf1.status === 'final' && (
            <Button
              variant="secondary"
              onClick={() => handleStatusChange('archived')}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Total Learners', value: sf1.total_learners, color: 'bg-violet-50 text-violet-600 ring-violet-100' },
          { icon: User, label: 'Male', value: sf1.total_male, color: 'bg-blue-50 text-blue-600 ring-blue-100' },
          { icon: User, label: 'Female', value: sf1.total_female, color: 'bg-pink-50 text-pink-600 ring-pink-100' },
          { icon: GraduationCap, label: 'Adviser', value: sf1.adviser_name || '—', color: 'bg-emerald-50 text-emerald-600 ring-emerald-100', small: true },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${card.color} mb-2`}>
              <card.icon className="w-4.5 h-4.5" />
            </div>
            <p className={`font-extrabold ${card.small ? 'text-sm' : 'text-2xl'} text-slate-900`}>{card.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
          </div>
        ))}
      </div>

      {/* DepEd Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 text-center space-y-1">
        <p className="text-xs font-semibold text-slate-500">Republic of the Philippines</p>
        <p className="text-xs font-semibold text-slate-500">Department of Education</p>
        <p className="text-xs text-slate-400">
          Region: {sf1.region || 'N/A'} | Division: {sf1.division || 'N/A'}
        </p>
        <h2 className="text-lg font-extrabold text-slate-900">{sf1.school_name || 'School Name'}</h2>
        <p className="text-xs text-slate-400">School ID: {sf1.school_id || 'N/A'}</p>
        <div className="pt-2 border-t border-slate-100">
          <p className="text-sm font-extrabold text-slate-900">
            SCHOOL FORM 1 (SF1) — School Register
          </p>
          <p className="text-xs text-slate-500">
            School Year: {sf1.school_year} | Grade: {sf1.grade_level} | Section: {sf1.section}
          </p>
          <p className="text-xs text-slate-500">
            Class Adviser: {sf1.adviser_name || '—'}
          </p>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">Learner Information</h3>
          <span className="text-xs font-bold text-slate-500">{students.length} learners</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">No.</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">LRN</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Last Name</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">First Name</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Middle</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Ext.</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Sex</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Birth Date</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Age</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Mother Tongue</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">IP</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Religion</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Address</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Parent/Guardian</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Contact</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-12 text-center">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-900">No students found</p>
                    <p className="text-xs text-slate-500">No enrolled students in this section</p>
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-slate-500 text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 text-slate-700 text-xs font-mono">{s.student_lrn || '—'}</td>
                    <td className="px-3 py-2 text-slate-900 text-xs font-semibold">{s.last_name || s.student_name?.split(',')[0]?.trim() || '—'}</td>
                    <td className="px-3 py-2 text-slate-700 text-xs">{s.first_name || s.student_name?.split(',')[1]?.trim() || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{s.middle_name || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{s.extension_name || ''}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        s.sex === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                      }`}>
                        {s.sex || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{s.birth_date || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{s.age || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{s.mother_tongue || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{s.indigenous_people || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{s.religion || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs max-w-[150px] truncate" title={s.address}>{s.address || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{s.mother_name || s.father_name || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{s.contact_number || '—'}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {s.enrollment_status || 'Enrolled'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
