import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  Skeleton, EmptyState,
} from '../components/ui';
import {
  History, User, ArrowRight,
  Search, Download, RefreshCw,
} from 'lucide-react';

const ACTION_CONFIG = {
  create: { color: 'bg-blue-100 text-blue-700', label: 'Created' },
  update: { color: 'bg-amber-100 text-amber-700', label: 'Updated' },
  submit: { color: 'bg-green-100 text-green-700', label: 'Submitted' },
  reopen: { color: 'bg-violet-100 text-violet-700', label: 'Reopened' },
  lock: { color: 'bg-red-100 text-red-700', label: 'Locked' },
  bulk_action: { color: 'bg-slate-100 text-slate-700', label: 'Bulk Action' },
};

const AttendanceAuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await api.get('/attendance/audit-trail/', { params });
      setLogs(res.data);
    } catch {
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actionFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const handleExport = () => {
    const headers = ['Date', 'User', 'Action', 'Classroom', 'Attendance Date', 'Previous Status', 'New Status', 'Description'];
    const rows = filteredLogs.map((log) => [
      new Date(log.created_at).toLocaleString(),
      log.user_name || '-',
      log.action_display || log.action,
      log.classroom_name || '-',
      log.date || '-',
      log.previous_status || '-',
      log.new_status || '-',
      log.description || '-',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance-audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Audit trail exported');
  };

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (log.user_name || '').toLowerCase().includes(q) ||
      (log.description || '').toLowerCase().includes(q) ||
      (log.classroom_name || '').toLowerCase().includes(q) ||
      (log.action_display || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="space-y-5 px-4 md:px-6 py-6">
        <Skeleton.PageHeader />
        <Skeleton.Table rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Attendance Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-1">Track all attendance changes and modifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by user, description, or classroom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="">All Actions</option>
              {Object.entries(ACTION_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From date"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To date"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
        </CardBody>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader divider>
          <CardTitle>Audit Log ({filteredLogs.length} entries)</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {filteredLogs.length === 0 ? (
            <EmptyState
              title="No Audit Entries"
              description="No audit trail entries match your filters"
              icon={<History className="w-8 h-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Classroom</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Status Change</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.update;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="w-3 h-3 text-slate-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-900">{log.user_name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${config.color}`}>
                            {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{log.classroom_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{log.date || '-'}</td>
                        <td className="px-4 py-3">
                          {log.previous_status && log.new_status ? (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{log.previous_status}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">{log.new_status}</span>
                            </div>
                          ) : log.new_status ? (
                            <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-xs font-medium">{log.new_status}</span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{log.description || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default AttendanceAuditTrail;
