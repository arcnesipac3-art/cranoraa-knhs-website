import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Search, Filter, Download, RefreshCw,
  ChevronDown, ChevronUp, MoreVertical,
  CheckCircle2, AlertTriangle, Archive, BookOpen,
} from 'lucide-react';
import api from '../utils/api';
import { LoadingSpinner, Button } from '../components/ui';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  draft: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
  final: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  archived: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: Archive },
};

export default function SF10Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ school_year: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.school_year) params.school_year = filters.school_year;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/sf10/', { params });
      setRecords(res.data.results || res.data);
    } catch {
      toast.error('Failed to load SF10 records');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleExport = async (id, type) => {
    try {
      const res = await api.get(`/sf10/${id}/export_${type}/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `SF10_${id}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      toast.success(`${type.toUpperCase()} exported successfully`);
    } catch {
      toast.error(`Failed to export ${type.toUpperCase()}`);
    }
    setActionMenu(null);
  };

  const handleRegenerate = async (id) => {
    try {
      await api.post(`/sf10/${id}/regenerate/`);
      toast.success('SF10 regenerated successfully');
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to regenerate SF10');
    }
    setActionMenu(null);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/sf10/${id}/update_status/`, { status: newStatus });
      toast.success(`SF10 marked as ${newStatus}`);
      fetchRecords();
    } catch {
      toast.error('Failed to update status');
    }
    setActionMenu(null);
  };

  const schoolYears = [...new Set(records.map(r => r.school_year))].sort().reverse();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>School Forms</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            School Form 10 (SF10)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Permanent Record — {records.length} record{records.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, LRN, school year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={filters.school_year}
              onChange={(e) => setFilters(f => ({ ...f, school_year: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              <option value="">All School Years</option>
              {schoolYears.map(sy => <option key={sy} value={sy}>{sy}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <LoadingSpinner />
            <p className="text-sm font-bold text-slate-400">Loading SF10 records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="w-12 h-12 text-slate-300" />
            <p className="text-sm font-bold text-slate-900">No SF10 Records Found</p>
            <p className="text-xs text-slate-500">SF10 records are generated from student enrollment history</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Student Name</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">LRN</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Sex</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Grade Levels</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Years Covered</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Generated</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => {
                  const st = STATUS_STYLES[record.status] || STATUS_STYLES.draft;
                  const StatusIcon = st.icon;
                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{record.student_name}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">{record.lrn || '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{record.sex || '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{record.grade_levels_covered || '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{record.years_covered || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(record.generated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.text} ${st.border}`}>
                          <StatusIcon className="w-3 h-3" />
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setActionMenu(actionMenu === record.id ? null : record.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </button>
                          {actionMenu === record.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
                              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                                <button
                                  onClick={() => handleExport(record.id, 'pdf')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Download className="w-4 h-4" /> Export PDF
                                </button>
                                {record.status === 'draft' && (
                                  <button
                                    onClick={() => handleStatusChange(record.id, 'final')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <CheckCircle2 className="w-4 h-4" /> Finalize
                                  </button>
                                )}
                                {record.status === 'final' && (
                                  <button
                                    onClick={() => handleStatusChange(record.id, 'archived')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                                  >
                                    <Archive className="w-4 h-4" /> Archive
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRegenerate(record.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                                >
                                  <RefreshCw className="w-4 h-4" /> Regenerate
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
