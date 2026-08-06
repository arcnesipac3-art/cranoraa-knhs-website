import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, Filter, Trash2, Download, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Clock, Users, Activity, Database, Shield,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, Calendar,
  ArrowUpRight, ArrowDownRight, TrendingUp, BarChart3, PieChart as PieIcon,
  Loader2, Info, X, SlidersHorizontal, ArrowUpDown
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Skeleton } from '../components/ui';

const PAGE_SIZE = 25;

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'grade_create', label: 'Grade Create' },
  { value: 'attendance_mark', label: 'Attendance Mark' },
];

const QUICK_FILTERS = [
  { id: 'today', label: 'Today', icon: Clock },
  { id: '7days', label: 'Last 7 Days', icon: Calendar },
  { id: '30days', label: 'Last 30 Days', icon: Calendar },
  { id: 'critical', label: 'Critical Only', icon: AlertTriangle },
];

const CHART_COLORS = {
  create: '#10b981',
  update: '#8b5cf6',
  delete: '#ef4444',
  login: '#6366f1',
  approve: '#0ea5e9',
  reject: '#f59e0b',
  other: '#94a3b8',
};

const PIE_COLORS = ['#10b981', '#8b5cf6', '#ef4444', '#6366f1', '#0ea5e9', '#f59e0b', '#94a3b8'];

function getActionColor(actionType) {
  const type = actionType?.toLowerCase() || '';
  if (type.includes('create') || type.includes('mark')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (type.includes('update') || type.includes('edit')) return 'bg-violet-50 text-violet-700 border-violet-200';
  if (type.includes('delete') || type.includes('clear')) return 'bg-red-50 text-red-700 border-red-200';
  if (type.includes('login') || type.includes('auth')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (type.includes('approve')) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (type.includes('reject') || type.includes('suspend') || type.includes('mute')) return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function getActionDot(actionType) {
  const type = actionType?.toLowerCase() || '';
  if (type.includes('create') || type.includes('mark')) return 'bg-emerald-500';
  if (type.includes('update') || type.includes('edit')) return 'bg-violet-500';
  if (type.includes('delete') || type.includes('clear')) return 'bg-red-500';
  if (type.includes('login') || type.includes('auth')) return 'bg-indigo-500';
  return 'bg-slate-400';
}

function formatRelativeTime(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* STAT CARD                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, trend, trendLabel, color, sub }) {
  const colorMap = {
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    red: 'bg-red-50 text-red-600 ring-red-100',
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${colorMap[color] || colorMap.violet} flex items-center justify-center ring-1`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* EMPTY STATE                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
function EmptyStateView({ onRefresh }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center mb-6 ring-1 ring-violet-200">
        <FileText className="w-10 h-10 text-violet-500" />
      </div>
      <h3 className="text-lg font-extrabold text-slate-900 mb-2">No log entries yet</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        System activity will appear here as users interact with the portal. 
        Audit logs track all important actions across the school management system.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ACTIVITY TIMELINE                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function ActivityTimeline({ logs, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-start gap-3">
            <div className="skeleton-shimmer w-2.5 h-2.5 rounded-full bg-slate-200 mt-1.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-shimmer h-3 bg-slate-200 rounded w-3/4" />
              <div className="skeleton-shimmer h-2.5 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-400 font-medium">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {logs.slice(0, 15).map((log, i) => (
        <div key={log.id} className="flex items-start gap-3 py-3 group">
          <div className="relative flex-shrink-0">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${getActionDot(log.action_type || log.action)}`} />
            {i < Math.min(logs.length, 15) - 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-px h-full bg-slate-200" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-slate-800 truncate">{log.user_name || 'System'}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getActionColor(log.action_type || log.action)}`}>
                {log.action}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">{log.description}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{formatRelativeTime(log.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* FILTER PANEL                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function FilterPanel({ search, setSearch, actionFilter, setActionFilter, quickFilter, setQuickFilter, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by user, model, or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 focus:bg-white transition-all"
          />
        </div>

        {/* Quick Filters */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Quick Filters</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setQuickFilter(quickFilter === f.id ? '' : f.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  quickFilter === f.id
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                }`}
              >
                <f.icon className="w-3 h-3" />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Type */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Action Type</p>
          <div className="flex flex-wrap gap-1.5">
            {ACTION_TYPES.map(a => (
              <button
                key={a.value}
                onClick={() => setActionFilter(a.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  actionFilter === a.value
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Close */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Close filters
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* MAIN AUDIT LOGS COMPONENT                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ size_mb: 0, max_mb: 50, count: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');
  const [detailLog, setDetailLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;

      // Apply quick filter date ranges
      if (quickFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.date_from = today;
        params.date_to = today;
      } else if (quickFilter === '7days') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        params.date_from = d.toISOString().split('T')[0];
      } else if (quickFilter === '30days') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        params.date_from = d.toISOString().split('T')[0];
      }

      const response = await api.get('/admin/audit-logs/', { params });
      const data = response.data;
      setLogs(Array.isArray(data.results) ? data.results : []);
      setTotalCount(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE) || 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, quickFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/audit-logs/stats/');
      setStats(response.data);
    } catch { /* ignore */ }
  }, []);

  // Fetch immediately on page change
  useEffect(() => { fetchLogs(); }, [page, fetchLogs]);

  // Debounce filter changes — reset to page 1 first
  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchLogs();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, actionFilter, quickFilter]);

  // Fetch stats on mount
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? logs.map(l => l.id) : []);
  };

  const handleSelectLog = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete this log entry?',
      text: 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/admin/audit-logs/${id}/`);
      toast.success('Log entry deleted');
      fetchLogs();
      setSelectedIds(prev => prev.filter(i => i !== id));
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} entries?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete all',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    setDeleting(true);
    try {
      await api.post('/admin/audit-logs/bulk_delete/', { ids: selectedIds });
      toast.success(`${selectedIds.length} entries deleted`);
      fetchLogs();
      setSelectedIds([]);
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete entries'); }
    finally { setDeleting(false); }
  };

  const handleClearAll = async () => {
    const result = await Swal.fire({
      title: 'Clear all logs?',
      text: 'This will permanently delete ALL audit log entries.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Clear all',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    setDeleting(true);
    try {
      await api.post('/admin/audit-logs/clear_all/');
      toast.success('All audit logs cleared');
      fetchLogs();
      setSelectedIds([]);
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to clear logs'); }
    finally { setDeleting(false); }
  };

  const handleExportCSV = () => {
    if (!logs.length) return toast.error('No data to export');
    const headers = ['ID', 'User', 'Email', 'Action', 'Description', 'Model', 'Timestamp'];
    const rows = logs.map(l => [l.id, l.user_name, l.user_email, l.action, l.description, l.model_name || '', l.timestamp]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      let va = a[sortField] || '';
      let vb = b[sortField] || '';
      if (sortField === 'timestamp') { va = new Date(va); vb = new Date(vb); }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [logs, sortField, sortDir]);

  const storagePercent = stats.max_mb ? (stats.size_mb / stats.max_mb) * 100 : 0;

  /* ── Derived chart data ── */
  const actionDistribution = useMemo(() => {
    const counts = {};
    logs.forEach(l => {
      const a = l.action || 'other';
      counts[a] = (counts[a] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const dailyActivity = useMemo(() => {
    const days = {};
    logs.forEach(l => {
      const d = new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days[d] = (days[d] || 0) + 1;
    });
    return Object.entries(days).slice(-7).map(([date, count]) => ({ date, count }));
  }, [logs]);

  const storageData = [
    { name: 'Used', value: stats.size_mb },
    { name: 'Free', value: Math.max(0, stats.max_mb - stats.size_mb) },
  ];

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-5 px-4 md:px-6 py-6">
        <Skeleton.PageHeader />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.StatCard key={i} />)}
        </div>
        <Skeleton.Table rows={8} cols={6} hasAvatar />
      </div>
    );
  }

  return (
    <div className="page-bottom-safe max-w-[1800px] mx-auto min-h-0 bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6 animate-fade-in">

      {/* ═══════════════════════════ HEADER ═══════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Security & Monitoring</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            {totalCount} total entries
            {storagePercent > 0 && (
              <span className="ml-2 text-slate-400">
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${storagePercent > 80 ? 'bg-red-500' : storagePercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {stats.size_mb}MB / {stats.max_mb}MB
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-bold hover:bg-red-100 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.length})
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => { fetchLogs(); fetchStats(); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══════════════════════════ STAT CARDS ═══════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <StatCard icon={FileText} label="Total Logs" value={stats.count || totalCount} color="violet" />
        <StatCard icon={CheckCircle2} label="Successful" value={stats.count || totalCount} color="emerald" sub="All recorded actions" />
        <StatCard icon={XCircle} label="Failed Actions" value={stats.failed_count || 0} color="red" sub="Requires attention" />
        <StatCard icon={Clock} label="Today" value={stats.today_count || 0} color="blue" sub="Activity today" />
        <StatCard icon={Database} label="Storage" value={`${stats.size_mb || 0}MB`} color="amber" sub={`${Math.round(storagePercent)}% of ${stats.max_mb}MB`} />
        <StatCard icon={AlertTriangle} label="Critical" value={stats.critical_count || 0} color="red" sub="Needs review" />
      </div>

      {/* ═══════════════════════════ CHARTS ═══════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Activity Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Daily Activity</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Last 7 days of system activity</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          {dailyActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyActivity}>
                <defs>
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#activityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-300">
              <BarChart3 className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Action Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Action Types</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Distribution of log actions</p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>
          {actionDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={actionDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {actionDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: 10, fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-300">
              <PieIcon className="w-8 h-8" />
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════ FILTERS ═══════════════════════════ */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-bold transition-all ${
            showFilters || actionFilter || quickFilter
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {(actionFilter || quickFilter) && (
            <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
              {(actionFilter ? 1 : 0) + (quickFilter ? 1 : 0)}
            </span>
          )}
        </button>

        {actionFilter && (
          <button
            onClick={() => setActionFilter('')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 text-xs font-bold hover:bg-violet-100 transition-all"
          >
            {ACTION_TYPES.find(a => a.value === actionFilter)?.label}
            <X className="w-3 h-3" />
          </button>
        )}
        {quickFilter && (
          <button
            onClick={() => setQuickFilter('')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 text-xs font-bold hover:bg-violet-100 transition-all"
          >
            {QUICK_FILTERS.find(f => f.id === quickFilter)?.label}
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <FilterPanel
            search={search}
            setSearch={setSearch}
            actionFilter={actionFilter}
            setActionFilter={setActionFilter}
            quickFilter={quickFilter}
            setQuickFilter={setQuickFilter}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════ MAIN CONTENT ═══════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

        {/* TABLE — 3/4 width */}
        <div className="xl:col-span-3">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {logs.length === 0 ? (
              <EmptyStateView onRefresh={fetchLogs} />
            ) : (
              <>
                {/* ── Mobile card list ── */}
                <div className="md:hidden">
                  {/* Select bar */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer no-min">
                      <input
                        type="checkbox"
                        checked={logs.length > 0 && selectedIds.length === logs.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
                      </span>
                    </label>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {sortedLogs.map(log => (
                      <div
                        key={log.id}
                        className={`px-4 py-3.5 transition-colors cursor-pointer hover:bg-slate-50 ${selectedIds.includes(log.id) ? 'bg-violet-50/40' : ''}`}
                        onClick={() => setDetailLog(detailLog?.id === log.id ? null : log)}
                      >
                        <div className="flex items-start gap-3">
                          <label className="flex-shrink-0 mt-0.5 cursor-pointer no-min" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(log.id)}
                              onChange={() => handleSelectLog(log.id)}
                              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                            />
                          </label>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-black text-[10px] flex-shrink-0">
                                  {log.user_name?.charAt(0).toUpperCase() || 'S'}
                                </div>
                                <p className="text-sm font-bold text-slate-800 truncate">{log.user_name}</p>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 flex-shrink-0">
                                {formatRelativeTime(log.timestamp)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mb-1 pl-9">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action_type || log.action)}`}>
                                {log.action}
                              </span>
                              {log.model_name && (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">
                                  {log.model_name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 pl-9">{log.description}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                            className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all no-min"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Desktop table ── */}
                <div className="hidden md:block overflow-x-hidden">
                  <table className="w-full text-left table-fixed">
                    <colgroup>
                      <col className="w-10" />
                      <col className="w-[90px]" />
                      <col className="w-[160px]" />
                      <col className="w-[80px]" />
                      <col />
                      <col className="w-[70px]" />
                      <col className="w-[60px]" />
                    </colgroup>
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2.5 w-10">
                          <input
                            type="checkbox"
                            checked={logs.length > 0 && selectedIds.length === logs.length}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                          />
                        </th>
                        <th
                          className="px-2 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap cursor-pointer hover:text-violet-600 transition-colors select-none"
                          onClick={() => toggleSort('timestamp')}
                        >
                          <span className="inline-flex items-center gap-0.5">
                            Time
                            <ArrowUpDown className="w-2.5 h-2.5" />
                          </span>
                        </th>
                        <th
                          className="px-2 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap cursor-pointer hover:text-violet-600 transition-colors select-none"
                          onClick={() => toggleSort('user_name')}
                        >
                          <span className="inline-flex items-center gap-0.5">
                            User
                            <ArrowUpDown className="w-2.5 h-2.5" />
                          </span>
                        </th>
                        <th
                          className="px-2 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap cursor-pointer hover:text-violet-600 transition-colors select-none"
                          onClick={() => toggleSort('action')}
                        >
                          <span className="inline-flex items-center gap-0.5">
                            Action
                            <ArrowUpDown className="w-2.5 h-2.5" />
                          </span>
                        </th>
                        <th className="px-2 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Description</th>
                        <th className="px-2 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap">Model</th>
                        <th className="px-2 py-2.5 w-15"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedLogs.map(log => (
                        <tr
                          key={log.id}
                          className={`group hover:bg-violet-50/30 transition-colors cursor-pointer ${selectedIds.includes(log.id) ? 'bg-violet-50/20' : ''}`}
                          onClick={() => setDetailLog(detailLog?.id === log.id ? null : log)}
                        >
                          <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(log.id)}
                              onChange={() => handleSelectLog(log.id)}
                              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <p className="text-[10px] font-bold text-slate-700 leading-tight">{new Date(log.timestamp).toLocaleDateString()}</p>
                            <p className="text-[9px] font-bold text-slate-400 leading-tight">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded bg-violet-100 flex items-center justify-center text-violet-700 font-black text-[8px] flex-shrink-0">
                                {log.user_name?.charAt(0).toUpperCase() || 'S'}
                              </div>
                              <p className="text-[11px] font-bold text-slate-800 truncate min-w-0">{log.user_name || 'System'}</p>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider leading-none ${getActionColor(log.action_type || log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-[11px] text-slate-600 truncate" title={log.description}>
                            {log.description}
                          </td>
                          <td className="px-2 py-2">
                            <span className="text-[9px] font-bold text-slate-400 leading-none">
                              {log.model_name || ''}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={() => setDetailLog(detailLog?.id === log.id ? null : log)}
                                className="p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all no-min"
                                title="View details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(log.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all no-min"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination */}
            {!loading && logs.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-slate-100 bg-slate-50/50 gap-3 flex-wrap">
                <span className="text-xs font-bold text-slate-500">
                  Page {page} of {totalPages}
                  <span className="hidden sm:inline"> &middot; {totalCount} entries</span>
                  {selectedIds.length > 0 && <span className="ml-2 text-violet-600">{selectedIds.length} selected</span>}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>
                  <span className="text-xs font-bold text-slate-500 px-1">{page} / {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════ SIDEBAR ═══════════════════════════ */}
        <div className="space-y-4">

          {/* Activity Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">Activity Feed</h3>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Recent system events</p>
            </div>
            <div className="px-4 py-2 max-h-[400px] overflow-y-auto">
              <ActivityTimeline logs={logs} loading={loading} />
            </div>
          </div>

          {/* Storage Widget */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Storage</h3>
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={storageData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={3} dataKey="value">
                  <Cell fill="#8b5cf6" />
                  <Cell fill="#f1f5f9" />
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }}
                  formatter={(v) => `${v} MB`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-2">
              <p className="text-lg font-extrabold text-slate-900">{stats.size_mb || 0}MB</p>
              <p className="text-[10px] text-slate-400 font-semibold">of {stats.max_mb}MB used</p>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${storagePercent > 80 ? 'bg-red-500' : storagePercent > 60 ? 'bg-amber-500' : 'bg-violet-500'}`}
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-extrabold text-slate-900">Actions</h3>
            </div>
            <div className="p-3 space-y-1.5">
              <button
                onClick={handleClearAll}
                disabled={deleting || !logs.length}
                className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-all disabled:opacity-40 text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Logs
              </button>
              <button
                onClick={handleExportCSV}
                disabled={!logs.length}
                className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-40 text-left"
              >
                <Download className="w-3.5 h-3.5" />
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ DETAIL MODAL ═══════════════════════════ */}
      <AnimatePresence>
        {detailLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[9999]"
            onClick={() => setDetailLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-black text-sm">
                    {detailLog.user_name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Log Detail</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">{detailLog.id && `#${detailLog.id}`}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailLog(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">User</p>
                    <p className="text-sm font-bold text-slate-900">{detailLog.user_name || 'System'}</p>
                    <p className="text-xs text-slate-500">{detailLog.user_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Action</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getActionColor(detailLog.action_type || detailLog.action)}`}>
                      {detailLog.action}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Timestamp</p>
                    <p className="text-sm font-bold text-slate-900">{new Date(detailLog.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Model</p>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">
                      {detailLog.model_name || 'System'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200">
                    {detailLog.description}
                  </p>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setDetailLog(null)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditLogs;
