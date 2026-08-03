import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  HeartPulse, Database, Server, HardDrive, Users, Shield,
  RefreshCw, Clock, Activity, Wifi, Cpu, MemoryStick,
  CheckCircle2, AlertTriangle, XCircle, TrendingUp, Zap,
  Globe, Lock, MonitorSmartphone, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import api from '../utils/api';
import { useParallelFetch } from '../hooks/useFetch';
import { Skeleton, Badge } from '../components/ui';
import toast from 'react-hot-toast';

/* ─── Gauge Component ─────────────────────────────────────────────────────── */
function GaugeCard({ icon: Icon, label, value, max, unit, color, status }) {
  const percent = max ? Math.min((value / max) * 100, 100) : value;
  const gaugeData = [{ name: label, value: percent, fill: color }];
  const statusColors = {
    good: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${
          status === 'critical' ? 'bg-red-50 text-red-600 ring-red-100' :
          status === 'warning' ? 'bg-amber-50 text-amber-600 ring-amber-100' :
          'bg-violet-50 text-violet-600 ring-violet-100'
        }`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[status] || statusColors.good}`}>
          {status === 'good' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Critical'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={8} data={gaugeData} startAngle={90} endAngle={-270}>
              <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={4} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}{unit}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
          {max && <p className="text-[10px] text-slate-400">of {max}{unit}</p>}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Service Status Card ─────────────────────────────────────────────────── */
function ServiceCard({ icon: Icon, name, status, detail, responseTime, color }) {
  const statusConfig = {
    operational: { dot: 'bg-emerald-500', label: 'Operational', badge: 'emerald' },
    degraded: { dot: 'bg-amber-500', label: 'Degraded', badge: 'amber' },
    down: { dot: 'bg-red-500', label: 'Down', badge: 'red' },
    online: { dot: 'bg-emerald-500', label: 'Online', badge: 'emerald' },
  };
  const s = statusConfig[status] || statusConfig.operational;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center ring-1`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`} />
          <Badge variant={s.badge} size="sm">{s.label}</Badge>
        </div>
      </div>
      <h3 className="text-sm font-extrabold text-slate-900">{name}</h3>
      <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
      {responseTime !== undefined && (
        <p className="text-[10px] text-slate-400 font-semibold mt-1">Response: {responseTime}ms</p>
      )}
    </div>
  );
}

/* ─── Metric Row ──────────────────────────────────────────────────────────── */
function MetricRow({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${color}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
          {sub && <p className="text-[10px] text-slate-400 font-medium">{sub}</p>}
        </div>
      </div>
      <div className="text-right">
        <span className="text-lg font-extrabold">{value}</span>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* MAIN SYSTEM HEALTH                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */
const SystemHealth = () => {
  const { data, loading, refetch } = useParallelFetch({
    stats: '/admin/stats/',
    metrics: '/admin/system-metrics/',
    feed: '/admin/maintenance-feed/',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [apiLatency, setApiLatency] = useState(null);

  const stats = data.stats || null;
  const metrics = data.metrics || null;
  const feed = data.feed || [];

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const t0 = Date.now();
      await refetch();
      setApiLatency(Date.now() - t0);
      setLastRefresh(new Date());
    } catch {
      toast.error('Failed to load system health data');
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) return (
    <div className="space-y-5 px-4 md:px-6 py-6">
      <Skeleton.PageHeader />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton.StatCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton.Banner className="h-64" />
        <Skeleton.Banner className="h-64" />
      </div>
    </div>
  );

  const storagePercent = metrics?.storageUsed ?? 0;
  const activeSessions = metrics?.activeSessions ?? 0;
  const authFailures = metrics?.authFailures ?? 0;
  const totalUsers = (stats?.total_students ?? 0) + (stats?.total_teachers ?? 0);
  const attendanceRate = stats?.today_rate ?? 0;
  const averageGrade = stats?.average_grade;

  const storageStatus = storagePercent < 70 ? 'good' : storagePercent < 85 ? 'warning' : 'critical';
  const storageColor = storagePercent < 70 ? '#10b981' : storagePercent < 85 ? '#f59e0b' : '#ef4444';

  const services = [
    { icon: Database, name: 'Database', status: stats ? 'operational' : 'degraded', detail: `Supabase PostgreSQL · ${storagePercent}% storage`, responseTime: apiLatency, color: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
    { icon: Server, name: 'REST API', status: 'online', detail: `Django REST Framework · ${apiLatency || '—'}ms latency`, responseTime: apiLatency, color: 'bg-violet-50 text-violet-600 ring-violet-100' },
    { icon: Globe, name: 'Frontend', status: 'operational', detail: 'React SPA · Vite Build', responseTime: null, color: 'bg-blue-50 text-blue-600 ring-blue-100' },
    { icon: Lock, name: 'Auth Service', status: authFailures > 10 ? 'degraded' : 'operational', detail: `${authFailures} failures in 24h`, responseTime: null, color: 'bg-indigo-50 text-indigo-600 ring-indigo-100' },
  ];

  const schoolMetrics = [
    { label: 'Classrooms', value: stats?.total_classes ?? 0, sub: 'Active sections', color: 'text-slate-900' },
    { label: 'Subjects', value: stats?.total_subjects ?? 0, sub: 'Registered', color: 'text-slate-900' },
    { label: 'Announcements', value: stats?.total_announcements ?? 0, sub: 'Published', color: 'text-slate-900' },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, sub: 'Today', color: attendanceRate >= 85 ? 'text-emerald-700' : attendanceRate >= 70 ? 'text-amber-700' : 'text-red-700' },
    { label: 'Average Grade', value: averageGrade != null ? averageGrade.toFixed(1) : '—', sub: 'Final grades', color: averageGrade != null ? (averageGrade >= 85 ? 'text-emerald-700' : 'text-violet-700') : 'text-slate-400' },
    { label: 'Pending Enrollments', value: stats?.pending_enrollments ?? 0, sub: 'Awaiting review', color: (stats?.pending_enrollments ?? 0) > 0 ? 'text-amber-700' : 'text-slate-900' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-1.5">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>System Monitoring</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">System Health</h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Last updated: {lastRefresh.toLocaleTimeString()}
            {apiLatency != null && <span className="ml-2">API: {apiLatency}ms</span>}
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Status */}
      <div className="bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-violet-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-slate-900">All Systems Operational</h2>
            <p className="text-sm text-slate-600 font-semibold">
              Supabase PostgreSQL · Django REST API · React Frontend
            </p>
          </div>
          <Badge variant="emerald" size="lg" className="hidden sm:inline-flex">Healthy</Badge>
        </div>
      </div>

      {/* Performance Gauges */}
      <div>
        <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <GaugeCard icon={HardDrive} label="Storage" value={storagePercent} max={100} unit="%" color={storageColor} status={storageStatus} />
          <GaugeCard icon={Users} label="Active Sessions" value={activeSessions} max={50} unit="" color="#8b5cf6" status={activeSessions > 40 ? 'warning' : 'good'} />
          <GaugeCard icon={Shield} label="Auth Failures" value={authFailures} max={20} unit="" color={authFailures > 10 ? '#ef4444' : '#10b981'} status={authFailures > 10 ? 'critical' : authFailures > 5 ? 'warning' : 'good'} />
          <GaugeCard icon={Zap} label="API Latency" value={apiLatency || 0} max={500} unit="ms" color={apiLatency > 200 ? '#f59e0b' : '#10b981'} status={apiLatency > 300 ? 'critical' : apiLatency > 150 ? 'warning' : 'good'} />
        </div>
      </div>

      {/* Core Services */}
      <div>
        <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">Core Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {services.map(s => (
            <ServiceCard key={s.name} {...s} />
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        {/* User Activity */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-extrabold text-slate-900">User Activity</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Portal usage metrics</p>
          </div>
          <div className="p-4 space-y-2">
            <MetricRow icon={Users} label="Total Users" value={totalUsers} sub="Students + Teachers" color="bg-violet-50 border-violet-100 text-violet-700" />
            <MetricRow icon={Activity} label="Active Now" value={activeSessions} sub="Currently online" color="bg-emerald-50 border-emerald-100 text-emerald-700" />
            <MetricRow icon={MonitorSmartphone} label="Students" value={stats?.total_students ?? 0} sub="Enrolled" color="bg-sky-50 border-sky-100 text-sky-700" />
            <MetricRow icon={Shield} label="Teachers" value={stats?.total_teachers ?? 0} sub="Active faculty" color="bg-indigo-50 border-indigo-100 text-indigo-700" />
            <MetricRow icon={Lock} label="Auth Failures" value={authFailures} sub="Last 24 hours" color={authFailures > 10 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-600'} />
            <MetricRow icon={CheckCircle2} label="Pending Approvals" value={stats?.pending_approvals ?? 0} sub="Awaiting action" color={(stats?.pending_approvals ?? 0) > 0 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-600'} />
          </div>
        </div>

        {/* School Statistics */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-extrabold text-slate-900">School Statistics</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Real-time school data</p>
          </div>
          <div className="p-4 space-y-2">
            {schoolMetrics.map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{row.label}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{row.sub}</p>
                </div>
                <span className={`text-lg font-extrabold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Maintenance Feed */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Maintenance Feed</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Recent system events</p>
          </div>
          <Activity className="w-4 h-4 text-slate-400" />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {feed.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">No Recent Activity</h3>
              <p className="text-xs text-slate-500">System audit log is clear</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {feed.map((item, i) => (
                <div key={item.id ?? i} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                    item.status === 'success' ? 'bg-emerald-500' :
                    item.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{item.action}</p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{item.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SystemHealth;
