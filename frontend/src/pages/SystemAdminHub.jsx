import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, FileText, HardDrive, Globe, MessageSquare, HeartPulse,
  Users, BookOpen, Megaphone, Clock, TrendingUp, Activity,
  ArrowRight, RefreshCw, Database, AlertTriangle, CheckCircle2,
  BarChart3, Eye
} from 'lucide-react';
import api from '../utils/api';
import { useParallelFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import PortalHubShell from '../components/PortalHubShell';
import { Card, CardHeader, CardBody, CardTitle, Button, Skeleton } from '../components/ui';
import { StatCard, RecentAnnouncementsWidget } from './dashboards/shared';
import QuickAccessLinks from '../components/dashboard/QuickAccessLinks';
import GradeRadarChart from '../components/dashboard/GradeRadarChart';
import AuditLogs from './AuditLogs';
import Backups from './Backups';
import WebsiteContentManagement from './WebsiteContentManagement';
import Moderation from './Moderation';
import SystemHealth from './SystemHealth';

/* ─── Delta Badge ─────────────────────────────────────────────────────────── */
const DeltaBadge = ({ value, label }) => {
  if (value == null) return null;
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    }`}>
      {positive ? '▲' : '▼'} {Math.abs(value)} {label}
    </span>
  );
};

/* ─── Last Fetched Timestamp ──────────────────────────────────────────────── */
const LastFetched = ({ ts }) => {
  if (!ts) return null;
  const fmt = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">Updated {fmt}</span>;
};

/* ─── Today Attendance Widget ─────────────────────────────────────────────── */
const TodayAttendanceWidget = ({ data, navigate }) => {
  const rate = data?.today_rate ?? null;
  const total = data?.today_total ?? null;
  const present = data?.today_present ?? null;
  const trends = data?.attendance?.daily_trends ?? [];
  const last7 = trends.slice(-7);

  const color = rate == null ? 'slate' : rate >= 85 ? 'emerald' : rate >= 70 ? 'amber' : 'rose';
  const palette = {
    emerald: { bg: 'bg-emerald-50 border-emerald-200', num: 'text-emerald-700', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50 border-amber-200', num: 'text-amber-700', bar: 'bg-amber-500' },
    rose: { bg: 'bg-rose-50 border-rose-200', num: 'text-rose-700', bar: 'bg-rose-500' },
    slate: { bg: 'bg-slate-50 border-slate-200', num: 'text-slate-600', bar: 'bg-slate-400' },
  }[color];

  return (
    <Card>
      <CardHeader divider className="bg-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle subtitle="School-wide today">Attendance</CardTitle>
          <button onClick={() => navigate('/analytics')}
            className="text-xs font-bold text-violet-600 hover:text-violet-700 uppercase tracking-wide">
            Details
          </button>
        </div>
      </CardHeader>
      <CardBody>
        <div className={`rounded-md border p-4 mb-4 ${palette.bg}`}>
          <p className={`text-4xl font-extrabold tabular-nums ${palette.num}`}>
            {rate != null ? `${rate}%` : '—'}
          </p>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">Today's Rate</p>
          {total != null && (
            <p className="text-xs text-slate-500 mt-1">
              {present != null ? `${present} / ` : ''}{total} records
            </p>
          )}
        </div>
        {last7.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Last 7 school days</p>
            <div className="flex items-end gap-1 h-10">
              {last7.map((d, i) => {
                const h = Math.max(4, Math.round((d.rate / 100) * 40));
                const barColor = d.rate >= 85 ? 'bg-emerald-500' : d.rate >= 70 ? 'bg-amber-400' : 'bg-rose-400';
                return (
                  <div key={i} title={`${d.date}: ${d.rate}%`} className="flex-1 rounded-sm transition-all" style={{ height: `${h}px` }}>
                    <div className={`w-full h-full ${barColor} rounded-sm`} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-slate-400">{last7[0]?.date?.slice(5)}</span>
              <span className="text-[9px] text-slate-400">{last7[last7.length - 1]?.date?.slice(5)}</span>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/* DASHBOARD OVERVIEW                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */
function DashboardOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { academicYear } = useActiveAcademicYear();
  const { data, loading, refetch } = useParallelFetch({
    stats: '/admin/stats/',
    metrics: '/admin/system-metrics/',
    feed: '/admin/maintenance-feed/',
  });
  const [auditStats, setAuditStats] = useState({ count: 0, size_mb: 0, max_mb: 50 });
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [subjectGrades, setSubjectGrades] = useState([]);

  const stats = data.stats || null;
  const metrics = data.metrics || null;
  const feed = data.feed || [];

  const fetchAuditStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/audit-logs/stats/');
      setAuditStats(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchSubjectGrades = useCallback(async () => {
    try {
      const gradeRes = await api.get('/grades/', {
        params: { grade_type: 'final_grade', ...(academicYear ? { academic_year: academicYear } : {}) },
      });
      const gradeList = Array.isArray(gradeRes.data) ? gradeRes.data : gradeRes.data?.results || [];
      const bySubject = {};
      gradeList.forEach(g => {
        if (g.raw_score == null) return;
        const name = g.subject_name || g.subject;
        if (!bySubject[name]) bySubject[name] = { total: 0, count: 0 };
        bySubject[name].total += parseFloat(g.raw_score);
        bySubject[name].count += 1;
      });
      const avgBySubject = Object.entries(bySubject)
        .map(([subject, v]) => ({ subject, score: Math.round(v.total / v.count * 10) / 10 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);
      setSubjectGrades(avgBySubject);
    } catch { /* optional */ }
  }, [academicYear]);

  useEffect(() => {
    fetchAuditStats();
    fetchSubjectGrades();
  }, [fetchAuditStats, fetchSubjectGrades]);

  useEffect(() => {
    if (data) setLastFetched(new Date());
  }, [data]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); await fetchAuditStats(); await fetchSubjectGrades(); } catch { /* ignore */ }
    finally { setRefreshing(false); }
  };

  const totalUsers = (stats?.total_students || 0) + (stats?.total_teachers || 0);
  const storagePercent = metrics?.storageUsed || 0;

  const today = useMemo(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), []);

  /* ── Critical Alerts ── */
  const criticalAlerts = useMemo(() => {
    if (!stats) return [];
    const alerts = [];
    if ((stats.pending_approvals || 0) > 0) {
      alerts.push({
        type: 'warning', title: 'Pending Approvals',
        message: `${stats.pending_approvals} account${stats.pending_approvals > 1 ? 's' : ''} awaiting approval`,
        action: () => navigate('/system-admin?tab=moderation'), actionLabel: 'Review Now',
      });
    }
    if ((stats.pending_enrollments || 0) > 0) {
      alerts.push({
        type: 'info', title: 'New Enrollments',
        message: `${stats.pending_enrollments} enrollment application${stats.pending_enrollments > 1 ? 's' : ''}`,
        action: () => navigate('/enrollment?tab=applications'), actionLabel: 'View Applications',
      });
    }
    const todayRate = stats.today_rate;
    if (todayRate != null && todayRate < 85) {
      alerts.push({
        type: 'warning', title: 'Low Attendance',
        message: `Today's attendance is ${todayRate}% (below 85% threshold)`,
        action: () => navigate('/analytics'), actionLabel: 'View Details',
      });
    }
    return alerts;
  }, [stats, navigate]);

  const feedStatusIcon = (status) => {
    if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  /* ── Skeleton Loading ── */
  if (loading && !stats) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard...">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2"><Skeleton className="h-3 w-32 rounded" /><Skeleton className="h-8 w-48 rounded" /></div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid grid-cols-6 gap-1.5">{[1,2,3,4,5,6].map(i => <Skeleton.StatCard key={i} />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {[1,2].map(c => (
              <div key={c} className="rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between p-4 border-b border-slate-100"><Skeleton className="h-4 w-32 rounded" /></div>
                <div className="p-4 space-y-2">{[1,2,3,4].map(i => <Skeleton.AnnouncementRow key={i} />)}</div>
              </div>
            ))}
          </div>
          <div className="space-y-5">
            {[1,2].map(c => (
              <div key={c} className="rounded-lg border border-slate-200 bg-white">
                <div className="p-4 border-b border-slate-100"><Skeleton className="h-4 w-32 rounded" /></div>
                <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton.ScheduleRow key={i} />)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6 animate-fade-in">

      {/* ── HERO CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 via-white to-violet-50/30 border border-violet-100 shadow-sm"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 px-6 py-6 md:px-8 md:py-7">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user?.first_name || 'Admin'} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 font-medium max-w-md">
              Manage your school's digital campus from one central dashboard.
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700 text-[11px] font-bold border border-violet-200">
                <BookOpen className="w-3 h-3" />
                Academic Year: {academicYear || '2026–2027'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">
                <Shield className="w-3 h-3" />
                System Administrator
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-4">
              <button onClick={() => navigate('/announcements')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-all shadow-sm">
                <Megaphone className="w-3.5 h-3.5" />
                Create Announcement
              </button>
              <button onClick={() => navigate('/people')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-700 text-xs font-bold border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all">
                <Users className="w-3.5 h-3.5" />
                Manage Users
              </button>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center w-28 h-28 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-50 ring-1 ring-violet-200/60 flex-shrink-0">
            <Shield className="w-14 h-14 text-violet-400" strokeWidth={1.2} />
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-violet-500 via-violet-400 to-violet-300" />
      </motion.div>

      {/* ── QUICK ACCESS ── */}
      <QuickAccessLinks role="admin" variant="grid" />

      {/* ── CRITICAL ALERTS ── */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-3">
          {criticalAlerts.map((alert, idx) => (
            <Card key={idx} className={`border-l-4 ${
              alert.type === 'warning' ? 'border-l-amber-500 bg-amber-50' :
              alert.type === 'error' ? 'border-l-red-500 bg-red-50' :
              'border-l-violet-500 bg-violet-50'
            }`}>
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                      alert.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                      alert.type === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-violet-100 text-violet-700'
                    }`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-extrabold mb-1 ${
                        alert.type === 'warning' ? 'text-amber-900' :
                        alert.type === 'error' ? 'text-red-900' : 'text-violet-900'
                      }`}>{alert.title}</p>
                      <p className={`text-xs ${
                        alert.type === 'warning' ? 'text-amber-700' :
                        alert.type === 'error' ? 'text-red-700' : 'text-violet-700'
                      }`}>{alert.message}</p>
                    </div>
                  </div>
                  {alert.action && (
                    <Button variant="secondary" size="sm" onClick={alert.action} className="flex-shrink-0">
                      {alert.actionLabel}
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ── SCHOOL OVERVIEW STAT CARDS ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">School Overview</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
          <StatCard
            label="Students" value={stats?.total_students} sub="Enrolled"
            icon={<Users className="w-5 h-5 md:w-6 md:h-6" />}
            color="blue" onClick={() => navigate('/people?tab=students')}
          />
          <StatCard
            label="Faculty" value={stats?.total_teachers} sub="Verified"
            icon={<BookOpen className="w-5 h-5 md:w-6 md:h-6" />}
            color="emerald" onClick={() => navigate('/people?tab=teachers')}
          />
          <StatCard
            label="Classrooms" value={stats?.total_classes} sub="Sections"
            icon={<Database className="w-5 h-5 md:w-6 md:h-6" />}
            color="sky" onClick={() => navigate('/classes')}
          />
          <StatCard
            label="Announcements" value={stats?.total_announcements} sub="Live"
            icon={<Megaphone className="w-5 h-5 md:w-6 md:h-6" />}
            color="amber" onClick={() => navigate('/announcements')}
          />
          <StatCard
            label="Pending Approvals" value={stats?.pending_approvals || 0} sub="Requires action"
            icon={<AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />}
            color="rose" onClick={() => navigate('/system-admin?tab=moderation')} badge={stats?.pending_approvals}
          />
          <StatCard
            label="Active Now" value={metrics?.activeSessions ?? 0}
            sub={`${stats?.today_rate != null ? stats.today_rate + '% attend.' : 'No data'}`}
            icon={<Activity className="w-5 h-5 md:w-6 md:h-6" />}
            color="slate" onClick={() => navigate('/analytics')}
          />
        </div>
      </div>

      {/* ── MAIN CONTENT 2/3 + 1/3 GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">

        {/* LEFT COLUMN (2/3) */}
        <div className="lg:col-span-2 space-y-5 md:space-y-6">

          {/* Academic Performance */}
          <Card>
            <CardHeader divider className="bg-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle subtitle="School-wide metrics">Academic Performance</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
                  Full Report
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-md bg-violet-50 border border-violet-200">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Average Grade</p>
                  <p className="text-4xl font-extrabold text-violet-700">
                    {stats?.average_grade != null ? stats.average_grade.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Across all subjects</p>
                </div>
                <div className="p-5 rounded-md bg-emerald-50 border border-emerald-200">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Attendance Rate</p>
                  <p className="text-4xl font-extrabold text-emerald-700">
                    {stats?.today_rate != null ? `${stats.today_rate}%` : '—'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Today's school-wide rate</p>
                </div>
                <div className="p-5 rounded-md bg-sky-50 border border-sky-200">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Passing Rate</p>
                  <p className="text-4xl font-extrabold text-sky-700">
                    {stats?.all_subjects?.total_count > 0
                      ? `${100 - (stats?.all_subjects?.below_75_pct ?? 0)}%` : '—'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Students at or above 75</p>
                </div>
              </div>

              {/* Grade Distribution */}
              <div className="mt-5 pt-5 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs mb-4">
                  <span className="font-bold text-slate-600">Grade Distribution</span>
                  <span className="text-slate-500">
                    {stats?.all_subjects?.total_count
                      ? `${stats.all_subjects.total_count.toLocaleString()} grade records`
                      : 'No grade data yet'}
                  </span>
                </div>
                {stats?.all_subjects?.total_count > 0 ? (
                  <div className="space-y-3">
                    {[
                      { label: 'Outstanding (90-100)', pct: stats?.all_subjects?.outstanding_pct ?? 0, color: 'bg-emerald-500' },
                      { label: 'Very Satisfactory (85-89)', pct: stats?.all_subjects?.very_satisfactory_pct ?? 0, color: 'bg-violet-500' },
                      { label: 'Satisfactory (80-84)', pct: stats?.all_subjects?.satisfactory_pct ?? 0, color: 'bg-sky-500' },
                      { label: 'Fairly Satisfactory (75-79)', pct: stats?.all_subjects?.fairly_satisfactory_pct ?? 0, color: 'bg-amber-500' },
                      { label: 'Did Not Meet (Below 75)', pct: stats?.all_subjects?.below_75_pct ?? 0, color: 'bg-rose-500' },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-700 font-semibold">{item.label}</span>
                          <span className="font-bold text-slate-900">{item.pct}%</span>
                        </div>
                        <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} transition-all duration-500`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-bold uppercase tracking-widest">No grade data available</p>
                    <p className="text-[10px] mt-1">Grades will appear here once teachers submit records.</p>
                  </div>
                )}
              </div>

              {subjectGrades.length >= 3 && (
                <div className="mt-5 pt-5 border-t border-slate-200">
                  <GradeRadarChart data={subjectGrades} title="Subject Performance Overview" height={240} />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Recent Announcements */}
          <RecentAnnouncementsWidget navigate={navigate} />
        </div>

        {/* RIGHT COLUMN (1/3) */}
        <div className="space-y-5 md:space-y-6">

          {/* Today's Attendance */}
          <TodayAttendanceWidget data={stats} navigate={navigate} />

          {/* System Links */}
          <Card>
            <CardHeader divider className="bg-slate-50">
              <CardTitle subtitle="Admin utilities">System</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {[
                { label: 'Audit Logs', path: '/system-admin?tab=audit-logs', icon: FileText },
                { label: 'System Health', path: '/system-admin?tab=system-health', icon: HeartPulse },
                { label: 'Backups', path: '/system-admin?tab=backups', icon: HardDrive },
                { label: 'Website Editor', path: '/system-admin?tab=website-editor', icon: Globe },
                { label: 'Moderation', path: '/system-admin?tab=moderation', icon: MessageSquare },
              ].map(({ label, path, icon: Icon }) => (
                <button key={path} onClick={() => navigate(path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition-all group text-left">
                  <div className="w-8 h-8 rounded-md bg-slate-100 group-hover:bg-violet-100 text-slate-600 group-hover:text-violet-700 flex items-center justify-center transition-colors shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-violet-700 transition-colors">{label}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-500 ml-auto transition-all group-hover:translate-x-0.5" />
                </button>
              ))}
            </CardBody>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader divider className="bg-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle subtitle="Latest system events">Activity</CardTitle>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <div className="max-h-[300px] overflow-y-auto">
              {feed.length === 0 ? (
                <div className="text-center py-10">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No recent activity</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {feed.slice(0, 8).map((item, i) => (
                    <div key={item.id || i} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="mt-0.5 flex-shrink-0">{feedStatusIcon(item.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.action}</p>
                        <p className="text-xs text-slate-500 truncate">{item.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── SYSTEM STATUS BAR ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-600">Database: Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-600">API: Online</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${storagePercent > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} />
              <span className="text-xs font-bold text-slate-600">Storage: {storagePercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-600">Sessions: {metrics?.activeSessions || 0}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LastFetched ts={lastFetched} />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab Configuration ───────────────────────────────────────────────────── */
const tabs = [
  { id: 'audit-logs', label: 'Audit Logs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', component: AuditLogs, roles: ['admin'] },
  { id: 'backups', label: 'Backups', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', component: Backups, roles: ['admin'] },
  { id: 'website-editor', label: 'Website Editor', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9', component: WebsiteContentManagement, roles: ['admin'] },
  { id: 'moderation', label: 'Moderation', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', component: Moderation, roles: ['admin'] },
  { id: 'system-health', label: 'System Health', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', component: SystemHealth, roles: ['admin'] },
];

const SystemAdminHub = () => (
  <PortalHubShell
    title="System Admin Hub"
    description="Audit, recovery, website operations, moderation, and system monitoring."
    tabs={[{ id: 'overview', label: 'Overview', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', component: DashboardOverview, roles: ['admin'] }, ...tabs]}
    showHeader={false}
  />
);

export default SystemAdminHub;
