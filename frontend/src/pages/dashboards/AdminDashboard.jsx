import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { useActiveAcademicYear } from '../../hooks/useActiveAcademicYear';
import { Card, CardHeader, CardBody, CardTitle, Button, Skeleton } from '../../components/ui';
import { StatCard, RecentAnnouncementsWidget } from './shared';
import QuickAccessLinks from '../../components/dashboard/QuickAccessLinks';
import GradeRadarChart from '../../components/dashboard/GradeRadarChart';

// ── Small delta badge shown under a stat card value ───────────────────────────
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

// ── "Last fetched" timestamp shown next to the Refresh button ─────────────────
const LastFetched = ({ ts }) => {
  if (!ts) return null;
  const fmt = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return (
    <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
      Updated {fmt}
    </span>
  );
};

// ── Live attendance mini-widget for the right column ─────────────────────────
const TodayAttendanceWidget = ({ data, navigate }) => {
  const rate    = data?.today_rate ?? null;
  const total   = data?.today_total ?? null;
  const present = data?.today_present ?? null;          // may not exist
  const trends  = data?.attendance?.daily_trends ?? [];
  const last7   = trends.slice(-7);

  // Determine colour bucket
  const color = rate == null ? 'slate'
    : rate >= 85 ? 'emerald'
    : rate >= 70 ? 'amber'
    : 'rose';

  const palette = {
    emerald: { bg: 'bg-emerald-50 border-emerald-200', num: 'text-emerald-700', bar: 'bg-emerald-500' },
    amber:   { bg: 'bg-amber-50 border-amber-200',     num: 'text-amber-700',   bar: 'bg-amber-500'   },
    rose:    { bg: 'bg-rose-50 border-rose-200',        num: 'text-rose-700',    bar: 'bg-rose-500'    },
    slate:   { bg: 'bg-slate-50 border-slate-200',      num: 'text-slate-600',   bar: 'bg-slate-400'   },
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

        {/* 7-day mini sparkbar */}
        {last7.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
              Last 7 school days
            </p>
            <div className="flex items-end gap-1 h-10">
              {last7.map((d, i) => {
                const h = Math.max(4, Math.round((d.rate / 100) * 40));
                const barColor = d.rate >= 85 ? 'bg-emerald-500' : d.rate >= 70 ? 'bg-amber-400' : 'bg-rose-400';
                return (
                  <div key={i} title={`${d.date}: ${d.rate}%`}
                    className="flex-1 rounded-sm transition-all"
                    style={{ height: `${h}px` }}>
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


const AdminDashboard = () => {
  const navigate = useNavigate();
  const { academicYear } = useActiveAcademicYear();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false); // inline refresh indicator
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [subjectGrades, setSubjectGrades] = useState([]);

  const fetchData = useCallback(async ({ showInitialLoading = false } = {}) => {
    if (showInitialLoading) setLoading(true);
    else setStatsLoading(true);
    setError(null);
    try {
      const r = await api.get('/admin/stats/', {
        params: academicYear ? { academic_year: academicYear } : undefined,
      });
      setData(r.data);
      setLastFetched(new Date());

      // Fetch per-subject average grades for radar chart
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
      } catch {
        // optional — radar chart just won't render
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError(err.response?.data?.error || 'Failed to load admin statistics.');
    } finally {
      setLoading(false);
      setStatsLoading(false);
      setRefreshing(false);
    }
  }, [academicYear]);

  useEffect(() => {
    fetchData({ showInitialLoading: true });
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const today = useMemo(() =>
    new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }), []);

  // Normalise today_rate — backend may return it at top level or nested under attendance
  const todayRate = data?.today_rate ?? data?.attendance?.today_rate ?? null;

  const criticalAlerts = useMemo(() => {
    if (!data) return [];
    const alerts = [];

    if ((data.pending_approvals || 0) > 0) {
      alerts.push({
        type: 'warning',
        title: 'Pending Approvals',
        message: `${data.pending_approvals} account${data.pending_approvals > 1 ? 's' : ''} awaiting approval`,
        action: () => navigate('/system-admin?tab=moderation'),
        actionLabel: 'Review Now',
      });
    }
    if ((data.pending_enrollments || 0) > 0) {
      alerts.push({
        type: 'info',
        title: 'New Enrollments',
        message: `${data.pending_enrollments} enrollment application${data.pending_enrollments > 1 ? 's' : ''}`,
        action: () => navigate('/enrollment?tab=applications'),
        actionLabel: 'View Applications',
      });
    }
    if (todayRate != null && todayRate < 85) {
      alerts.push({
        type: 'warning',
        title: 'Low Attendance',
        message: `Today's attendance is ${todayRate}% (below 85% threshold)`,
        action: () => navigate('/analytics'),
        actionLabel: 'View Details',
      });
    }
    return alerts;
  }, [data, todayRate, navigate]);

  // ── Inline stat overlay when refreshing after initial load ───────────────
  const statOverlay = (statsLoading || refreshing) && data;


  // ── Skeleton loading (initial load only) ────────────────────────────────
  if (loading && !data) return (
    <div className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6" aria-busy="true" aria-label="Loading dashboard…">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-3 w-36 rounded" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-24 rounded" />
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3,4,5,6].map(i => <Skeleton.QuickTile key={i} />)}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-28 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
          {[1,2,3,4,5,6].map(i => <Skeleton.StatCard key={i} />)}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <div className="lg:col-span-2 space-y-5">
          {[1,2].map(c => (
            <div key={c} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
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

  if (error && !data) return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <Card className="max-w-xl mx-auto border-l-4 border-l-red-500">
        <CardHeader divider className="bg-red-50">
          <CardTitle subtitle="The dashboard stats endpoint did not return usable data">
            Admin Dashboard Unavailable
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-700">{error}</p>
          <Button onClick={() => fetchData({ showInitialLoading: true })}>Retry</Button>
        </CardBody>
      </Card>
    </div>
  );


  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="page-bottom-safe max-w-[1800px] mx-auto min-h-0 bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6"
    >
      {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Administrative Control</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-semibold">{today}</p>
        </div>

        <div className="flex items-center gap-3">
          <LastFetched ts={lastFetched} />
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing || statsLoading}>
            <svg className={`w-4 h-4 ${(refreshing || statsLoading) ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {(refreshing || statsLoading) ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* ── QUICK ACCESS (single source of navigation — no duplicate card) ── */}
      <QuickAccessLinks role="admin" variant="grid" />

      {/* ── CRITICAL ALERTS ──────────────────────────────────────────────── */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-3">
          {criticalAlerts.map((alert, idx) => (
            <Card key={idx} className={`border-l-4 ${
              alert.type === 'warning' ? 'border-l-amber-500 bg-amber-50' :
              alert.type === 'error'   ? 'border-l-red-500   bg-red-50'   :
                                         'border-l-violet-500 bg-violet-50'
            }`}>
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                      alert.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                      alert.type === 'error'   ? 'bg-red-100   text-red-700'   :
                                                  'bg-violet-100 text-violet-700'
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d={alert.type === 'error'
                            ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-extrabold mb-1 ${
                        alert.type === 'warning' ? 'text-amber-900' :
                        alert.type === 'error'   ? 'text-red-900'   : 'text-violet-900'
                      }`}>{alert.title}</p>
                      <p className={`text-xs ${
                        alert.type === 'warning' ? 'text-amber-700' :
                        alert.type === 'error'   ? 'text-red-700'   : 'text-violet-700'
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


      {/* ── SCHOOL OVERVIEW STAT CARDS ───────────────────────────────────── */}
      {/* Inline shimmer overlay on refresh so cards don't disappear          */}
      <div className={`transition-opacity duration-200 ${statOverlay ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">School Overview</h2>
          {statOverlay && (
            <span className="text-[10px] font-bold text-violet-600 flex items-center gap-1.5">
              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Updating…
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
        <StatCard
            label="Students" value={data?.total_students} sub="Enrolled"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            color="blue" onClick={() => navigate('/people?tab=students')}
          />
          <StatCard
            label="Faculty" value={data?.total_teachers} sub="Verified"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            color="emerald" onClick={() => navigate('/people?tab=teachers')}
          />
          <StatCard
            label="Classrooms" value={data?.total_classes} sub="Sections"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            color="sky" onClick={() => navigate('/classes')}
          />
          <StatCard
            label="Announcements" value={data?.total_announcements} sub="Live"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
            color="amber" onClick={() => navigate('/announcements')}
          />
          <StatCard
            label="Pending Approvals" value={data?.pending_approvals || 0} sub="Requires action"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            color="rose" onClick={() => navigate('/system-admin?tab=moderation')} badge={data?.pending_approvals}
          />
          <StatCard
            label="Active Now" value={data?.active_users ?? 0}
            sub={`${todayRate != null ? todayRate + '% attend.' : 'No data'}`}
            icon={<svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9 10a2 2 0 104 0 2 2 0 00-4 0m6.364-3.636a5 5 0 010 7.272M6.636 6.364a5 5 0 000 7.272" /></svg>}
            color="slate" onClick={() => navigate('/analytics')}
          />
        </div>
      </div>


      {/* ── MAIN CONTENT 2/3 + 1/3 GRID ────────────────────────────────── */}
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
                    {data?.average_grade != null ? data.average_grade.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Across all subjects</p>
                </div>
                <div className="p-5 rounded-md bg-emerald-50 border border-emerald-200">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Attendance Rate</p>
                  <p className="text-4xl font-extrabold text-emerald-700">
                    {todayRate != null ? `${todayRate}%` : '—'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Today's school-wide rate</p>
                </div>
                <div className="p-5 rounded-md bg-sky-50 border border-sky-200">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Passing Rate</p>
                  <p className="text-4xl font-extrabold text-sky-700">
                    {data?.all_subjects?.total_count > 0
                      ? `${100 - (data?.all_subjects?.below_75_pct ?? 0)}%` : '—'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Students at or above 75</p>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs mb-4">
                  <span className="font-bold text-slate-600">Grade Distribution</span>
                  <span className="text-slate-500">
                    {data?.all_subjects?.total_count
                      ? `${data.all_subjects.total_count.toLocaleString()} grade records`
                      : 'No grade data yet'}
                  </span>
                </div>
                {data?.all_subjects?.total_count > 0 ? (
                  <div className="space-y-3">
                    {[
                      { label: 'Outstanding (90-100)',         pct: data?.all_subjects?.outstanding_pct ?? 0,          color: 'bg-emerald-500' },
                      { label: 'Very Satisfactory (85-89)',    pct: data?.all_subjects?.very_satisfactory_pct ?? 0,     color: 'bg-violet-500'  },
                      { label: 'Satisfactory (80-84)',         pct: data?.all_subjects?.satisfactory_pct ?? 0,          color: 'bg-sky-500'     },
                      { label: 'Fairly Satisfactory (75-79)',  pct: data?.all_subjects?.fairly_satisfactory_pct ?? 0,   color: 'bg-amber-500'   },
                      { label: 'Did Not Meet (Below 75)',      pct: data?.all_subjects?.below_75_pct ?? 0,              color: 'bg-rose-500'    },
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
                    <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-xs font-bold uppercase tracking-widest">No grade data available</p>
                    <p className="text-[10px] mt-1">Grades will appear here once teachers submit records.</p>
                  </div>
                )}
              </div>

              {subjectGrades.length >= 3 && (
                <div className="mt-5 pt-5 border-t border-slate-200">
                  <GradeRadarChart
                    data={subjectGrades}
                    title="Subject Performance Overview"
                    height={240}
                  />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Recent Announcements */}
          <RecentAnnouncementsWidget navigate={navigate} />
        </div>

        {/* RIGHT COLUMN (1/3) */}
        <div className="space-y-5 md:space-y-6">

          {/* Today's Attendance widget — REAL data, replaces hardcoded health */}
          <TodayAttendanceWidget data={data} navigate={navigate} />

          {/* System links */}
          <Card>
            <CardHeader divider className="bg-slate-50">
              <CardTitle subtitle="Admin utilities">System</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {[
                { label: 'Audit Logs',    path: '/system-admin?tab=audit-logs',    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { label: 'System Health', path: '/system-admin?tab=system-health', icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
                { label: 'Settings',      path: '/settings',                       icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                { label: 'Backups',       path: '/system-admin?tab=backups',       icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
              ].map(({ label, path, icon }) => (
                <button key={path} onClick={() => navigate(path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition-all group text-left">
                  <div className="w-8 h-8 rounded-md bg-slate-100 group-hover:bg-violet-100 text-slate-600 group-hover:text-violet-700 flex items-center justify-center transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-violet-700 transition-colors">{label}</span>
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-violet-500 ml-auto transition-all group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </CardBody>
          </Card>

        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
