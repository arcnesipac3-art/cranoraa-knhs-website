import { useState, useMemo } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import {
  HardDrive, Download, Upload, Trash2, RefreshCw, Clock,
  Database, CheckCircle2, AlertTriangle, Plus, Archive,
  Shield, ArrowUpDown, ChevronDown, FileDown, Printer
} from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { Skeleton, Badge } from '../components/ui';

const Backups = () => {
  const { data: backups, loading, refetch: fetchBackups, setData: setBackups } = useFetch('/admin/backups/');
  const [creating, setCreating] = useState(false);
  const [sortDir, setSortDir] = useState('desc');

  const sortedBackups = useMemo(() => {
    if (!Array.isArray(backups)) return [];
    return [...backups].sort((a, b) => {
      const da = new Date(a.created_at);
      const db = new Date(b.created_at);
      return sortDir === 'desc' ? db - da : da - db;
    });
  }, [backups, sortDir]);

  const totalSize = useMemo(() => {
    if (!Array.isArray(backups)) return '0 MB';
    const bytes = backups.reduce((acc, b) => {
      const match = b.size?.match(/([\d.]+)\s*(MB|KB|GB)/i);
      if (!match) return acc;
      const val = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      return acc + (unit === 'GB' ? val * 1024 : unit === 'KB' ? val / 1024 : val);
    }, 0);
    return `${bytes.toFixed(1)} MB`;
  }, [backups]);

  const handleCreateBackup = async () => {
    const result = await Swal.fire({
      title: 'Create new backup?',
      text: 'This will create a snapshot of the entire database.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Create backup',
      confirmButtonColor: '#7c3aed',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    setCreating(true);
    try {
      await api.post('/admin/backups/');
      toast.success('Backup created successfully');
      fetchBackups();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create backup');
    } finally { setCreating(false); }
  };

  const handleRestore = async (id) => {
    const result = await Swal.fire({
      title: 'Restore this backup?',
      text: 'This will overwrite all current data. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Restore',
      confirmButtonColor: '#ef4444',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    try {
      await api.post(`/admin/backups/${id}/restore/`);
      toast.success('Backup restored. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to restore backup');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete this backup?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/admin/backups/${id}/`);
      setBackups(prev => prev.filter(b => b.id !== id));
      toast.success('Backup deleted');
    } catch { toast.error('Failed to delete backup'); }
  };

  const handleDownload = async (id, filename) => {
    try {
      const r = await api.get(`/admin/backups/${id}/download/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to download backup');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-5 px-4 md:px-6 py-6">
        <Skeleton.PageHeader />
        <Skeleton.Table rows={5} cols={5} hasAvatar={false} />
      </div>
    );
  }

  return (
    <div className="page-bottom-safe max-w-[1800px] mx-auto min-h-0 bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Data Protection</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Database Backups</h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            {Array.isArray(backups) ? backups.length : 0} backups &middot; {totalSize} total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => fetchBackups()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all disabled:opacity-50 shadow-sm"
          >
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Backup
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Archive, label: 'Total Backups', value: Array.isArray(backups) ? backups.length : 0, color: 'bg-violet-50 text-violet-600 ring-violet-100' },
          { icon: Database, label: 'Total Size', value: totalSize, color: 'bg-blue-50 text-blue-600 ring-blue-100' },
          { icon: Clock, label: 'Latest', value: sortedBackups[0] ? new Date(sortedBackups[0].created_at).toLocaleDateString() : '—', color: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
          { icon: Shield, label: 'Status', value: 'Protected', color: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all"
          >
            <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center ring-1 mb-3`}>
              <stat.icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Important</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Backups are SQL dumps of the entire database. Create backups before major changes.
            Restoring will overwrite all current data — this cannot be undone.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {sortedBackups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center mb-6 ring-1 ring-violet-200">
              <HardDrive className="w-10 h-10 text-violet-500" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">No backups yet</h3>
            <p className="text-sm text-slate-500 max-w-md mb-6">
              Create your first backup to protect your school data. Backups capture the entire database state.
            </p>
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create First Backup
            </button>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sortedBackups.length} backups</span>
                <button
                  onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-violet-600 transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  {sortDir === 'desc' ? 'Newest' : 'Oldest'}
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {sortedBackups.map((backup, i) => (
                  <motion.div
                    key={backup.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-4 py-3.5 space-y-2.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <Archive className="w-4.5 h-4.5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 font-mono truncate">{backup.filename}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {new Date(backup.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' · '}
                          {new Date(backup.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge variant="slate" size="sm">{backup.size}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 pl-12">
                      <button
                        onClick={() => handleDownload(backup.id, backup.filename)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-[10px] font-bold hover:bg-violet-100 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                      <button
                        onClick={() => handleRestore(backup.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold hover:bg-emerald-100 transition-all"
                      >
                        <Upload className="w-3 h-3" />
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(backup.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all ml-auto"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Filename</th>
                    <th
                      className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap cursor-pointer hover:text-violet-600 transition-colors select-none"
                      onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Created At
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Size</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedBackups.map((backup, i) => (
                    <motion.tr
                      key={backup.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                            <Archive className="w-4 h-4 text-violet-500" />
                          </div>
                          <span className="text-sm font-bold text-slate-800 font-mono">{backup.filename}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(backup.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="slate" size="sm">{backup.size}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDownload(backup.id, backup.filename)}
                            title="Download"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs font-bold hover:bg-violet-100 transition-all opacity-0 group-hover:opacity-100 no-min"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                          <button
                            onClick={() => handleRestore(backup.id)}
                            title="Restore"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-all opacity-0 group-hover:opacity-100 no-min"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Restore
                          </button>
                          <button
                            onClick={() => handleDelete(backup.id)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 no-min"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Backups;
