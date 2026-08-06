import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Search, Filter, Download, Eye, RefreshCw,
  Trash2, Printer, Archive, ChevronDown, ChevronUp, MoreVertical,
  CheckCircle2, AlertTriangle, BookOpen,
} from 'lucide-react';
import api from '../utils/api';
import { Skeleton, Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from '../components/ui';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  draft:    { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: AlertTriangle },
  final:    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  archived: { bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200',   icon: Archive },
};

// Revoke all object URLs created during exports to prevent memory leaks
function revokeUrlSafe(url) {
  try { window.URL.revokeObjectURL(url); } catch { /* ignore */ }
}

export default function SF1Dashboard() {
  const navigate = useNavigate();
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters]       = useState({ school_year: '', grade_level: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounce search input — only fires fetch after 400ms of no typing
  const debounceRef = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.school_year) params.school_year = filters.school_year;
      if (filters.grade_level) params.grade_level = filters.grade_level;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/school-forms/sf1/', { params });
      setRecords(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) {
      console.error('[SF1Dashboard] fetchRecords error:', err);
      toast.error('Failed to load SF1 records');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/school-forms/sf1/${deleteModal.id}/`);
      toast.success('SF1 record deleted');
      setDeleteModal(null);
      fetchRecords();
    } catch {
      toast.error('Failed to delete SF1 record');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async (id, type) => {
    setActionMenu(null);
    let url = null;
    try {
      const res = await api.get(`/school-forms/sf1/${id}/export_${type}/`, { responseType: 'blob' });
      const mimeType = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const ext = type === 'excel' ? 'xlsx' : 'pdf';
      url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `SF1_${type}_${id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`${type === 'excel' ? 'Excel' : 'PDF'} exported successfully`);
    } catch (err) {
      console.error('[SF1Dashboard] export error:', err);
      toast.error(`Failed to export ${type === 'excel' ? 'Excel' : 'PDF'}`);
    } finally {
      if (url) revokeUrlSafe(url);
    }
  };

  const handlePrint = async (id) => {
    setActionMenu(null);
    let url = null;
    try {
      const res = await api.get(`/school-forms/sf1/${id}/print_view/`, { responseType: 'blob' });
      url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const win = window.open(url, '_blank');
      if (!win) toast.error('Popup blocked — allow popups for this site to print.');
      else toast.success('Print view opened');
    } catch (err) {
      console.error('[SF1Dashboard] print error:', err);
      toast.error('Failed to open print view');
    } finally {
      // Delay revoke so the new tab has time to load the blob
      if (url) setTimeout(() => revokeUrlSafe(url), 30000);
    }
  };

  const handleRegenerate = async (id) => {
    try {
      await api.post(`/school-forms/sf1/${id}/regenerate/`);
      toast.success('SF1 regenerated successfully');
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to regenerate SF1');
    }
    setActionMenu(null);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/school-forms/sf1/${id}/update_status/`, { status: newStatus });
      toast.success(`SF1 marked as ${newStatus}`);
      fetchRecords();
    } catch {
      toast.error('Failed to update status');
    }
    setActionMenu(null);
  };

  const gradeLevels = [...new Set(records.map(r => r.grade_level))].sort();
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
            School Form 1 (SF1)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            School Register — {records.length} record{records.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/school-forms/sf1/generate')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Generate SF1
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by LRN, student name, section, school year..."
              value={search}
              onChange={handleSearchChange}
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
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={filters.school_year}
              onChange={(e) => setFilters(f => ({ ...f, school_year: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              <option value="">All School Years</option>
              {schoolYears.map(sy => <option key={sy} value={sy}>{sy}</option>)}
            </select>
            <select
              value={filters.grade_level}
              onChange={(e) => setFilters(f => ({ ...f, grade_level: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              <option value="">All Grade Levels</option>
              {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
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
          <Skeleton.Table />
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="w-12 h-12 text-slate-300" />
            <p className="text-sm font-bold text-slate-900">No SF1 Records Found</p>
            <p className="text-xs text-slate-500">Generate your first SF1 to get started</p>
            <button
              onClick={() => navigate('/school-forms/sf1/generate')}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Generate SF1
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">School Year</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Grade</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Section</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Adviser</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Learners</th>
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
                      <td className="px-4 py-3 font-semibold text-slate-900">{record.school_year}</td>
                      <td className="px-4 py-3 text-slate-700">{record.grade_level}</td>
                      <td className="px-4 py-3 text-slate-700">{record.section}</td>
                      <td className="px-4 py-3 text-slate-600">{record.adviser_name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-emerald-600 font-bold">{record.total_male}</span>
                          <span className="text-slate-400">M</span>
                          <span className="text-slate-300 mx-0.5">/</span>
                          <span className="text-pink-600 font-bold">{record.total_female}</span>
                          <span className="text-slate-400">F</span>
                          <span className="text-slate-300 mx-0.5">=</span>
                          <span className="font-extrabold text-slate-900">{record.total_learners}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {record.generated_at ? new Date(record.generated_at).toLocaleDateString() : '—'}
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
                                  onClick={() => { navigate(`/school-forms/sf1/${record.id}`); setActionMenu(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Eye className="w-4 h-4" /> View
                                </button>
                                <button
                                  onClick={() => handleExport(record.id, 'pdf')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Download className="w-4 h-4" /> Export PDF
                                </button>
                                <button
                                  onClick={() => handleExport(record.id, 'excel')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Download className="w-4 h-4" /> Export Excel
                                </button>
                                <button
                                  onClick={() => handlePrint(record.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Printer className="w-4 h-4" /> Print
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
                                {record.status !== 'final' && (
                                  <button
                                    onClick={() => { setDeleteModal(record); setActionMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete
                                  </button>
                                )}
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

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)}>
        <ModalHeader>
          <ModalTitle title="Delete SF1 Record" />
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete the SF1 for <strong>{deleteModal?.grade_level} {deleteModal?.section}</strong> ({deleteModal?.school_year})?
            This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
}
