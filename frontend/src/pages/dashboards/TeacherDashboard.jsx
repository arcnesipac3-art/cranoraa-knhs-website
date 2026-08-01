import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import apiCache from '../../utils/apiCache';
import { useOfflineMode } from '../../hooks/useBackendStatus';
import {
  Card, CardHeader, CardBody, CardTitle,
  Button, Badge, EmptyState, Skeleton,
} from '../../components/ui';
import {
  SchoolHeaderBanner, StatCard,
  TodayScheduleWidget,
} from './shared';
import QuickAccessLinks from '../../components/dashboard/QuickAccessLinks';

const getLocalDateStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const ACTIVITY_ICONS = {
  grade: { bg: 'bg-violet-100', text: 'text-violet-600', path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  attendance: { bg: 'bg-emerald-100', text: 'text-emerald-600', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  system: { bg: 'bg-slate-100', text: 'text-slate-500', path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
};

function formatActivityTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMessageTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  if (today) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Fix: useNotifications must be called unconditionally at top-level (Rules of Hooks)
  const { unreadCount: notifUnread } = useNotifications();

  const [data, setData]               = useState(null);
  const [classrooms, setClassrooms]   = useState([]);
  const [subjects, setSubjects]       = useState([]);
  const [todayAttMap, setTodayAttMap] = useState({});
  const [classGrades, setClassGrades] = useState({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [usingCache, setUsingCache]   = useState(false);
  const { isOfflineMode } = useOfflineMode();

  const classroomSubjectCodes = useMemo(() => {
    const map = {};
    subjects.forEach(s => {
      const id = s.classroom;
      if (!map[id]) map[id] = [];
      if (s.subject_code && !map[id].includes(s.subject_code)) {
        map[id].push(s.subject_code);
      }
    });
    return map;
  }, [subjects]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const today = getLocalDateStr();
    const cacheKey = (url) => `${url}?_date=${today}`;

    // 1. Load from cache immediately
    const cachedData = {
      stats: apiCache.get(cacheKey('/teacher/stats/')),
      classrooms: apiCache.get('/classrooms/'),
      subjects: apiCache.get(cacheKey(`/classroom-subjects/by_teacher/?teacher_id=${user?.id}`)),
      attendance: apiCache.get(cacheKey(`/attendance/?date=${today}`)),
    };

    const hasCache = Object.values(cachedData).some(Boolean);
    if (hasCache) {
      if (cachedData.stats) setData(cachedData.stats);
      if (cachedData.classrooms) setClassrooms(cachedData.classrooms);
      if (cachedData.subjects) setSubjects(cachedData.subjects);
      setUsingCache(true);
      setLoading(false);
    }

    // 2. Fetch from network
    try {
      const [statsRes, clsRes, subjectsRes, attRes] = await Promise.all([
        api.get('/teacher/stats/'),
        // Fix: filter classrooms to teacher's own — not all classrooms
        api.get('/classrooms/', { params: { teacher: user?.id } }),
        api.get(`/classroom-subjects/by_teacher/?teacher_id=${user?.id}`),
        api.get(`/attendance/?date=${today}`),
      ]);

      const cls = Array.isArray(clsRes.data) ? clsRes.data : clsRes.data?.results || [];
      setData(statsRes.data);
      setClassrooms(cls);
      setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);

      const rawAtt = Array.isArray(attRes.data) ? attRes.data : [];
      const attMap = {};
      rawAtt.forEach(rec => {
        const cid = rec.classroom;
        if (!attMap[cid]) attMap[cid] = { marked: false, presentCount: 0, totalCount: 0 };
        attMap[cid].marked = true;
        attMap[cid].totalCount += 1;
        if (['present', 'late'].includes(rec.status)) {
          attMap[cid].presentCount += 1;
        }
      });
      setTodayAttMap(attMap);

      // Fix: batch grade summaries in one request using classroom IDs param instead of N+1
      if (cls.length > 0) {
        const clsIds = cls.map(c => c.id).join(',');
        const gradeRes = await api.get(`/grades/summary/?classrooms=${clsIds}`).catch(() => ({ data: null }));
        const gMap = {};
        if (gradeRes.data && typeof gradeRes.data === 'object') {
          // Expect { classroom_id: { average: 85.2 }, ... } shape from batch endpoint
          Object.entries(gradeRes.data).forEach(([cid, d]) => {
            if (d?.average != null) gMap[Number(cid)] = Math.round(d.average);
          });
        }
        // Fallback: if batch endpoint not supported, skip — don't do N+1
        setClassGrades(gMap);
      }

      // 3. Update cache
      apiCache.set(cacheKey('/teacher/stats/'), statsRes.data, 60 * 60 * 1000);
      apiCache.set('/classrooms/', clsRes.data, 60 * 60 * 1000);
      apiCache.set(cacheKey(`/classroom-subjects/by_teacher/?teacher_id=${user?.id}`), subjectsRes.data, 60 * 60 * 1000);
      apiCache.set(cacheKey(`/attendance/?date=${today}`), attRes.data, 60 * 60 * 1000);
      setUsingCache(false);
    } catch (err) {
      console.error('Teacher dashboard load failed:', err);
      // Only show error if no cached data was loaded
      const hasAnyCache = cachedData.stats || cachedData.classrooms || cachedData.subjects;
      if (!hasAnyCache) setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const today = useMemo(() =>
    new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }), []);

  // ── Skeleton ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6"
      aria-busy="true" aria-label="Loading dashboard…">
      <div className="rounded-lg border border-slate-200 bg-white p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 md:w-16 md:h-16 rounded-md shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          </div>
          <Skeleton className="h-16 w-48 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3,4,5,6].map(i => <Skeleton.QuickTile key={i} />)}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-16 rounded" />
        <div className="grid grid-cols-5 gap-1.5">
          {[1,2,3,4,5].map(i => <Skeleton.StatCard key={i} />)}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton.ClassCard key={i} />)}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        {[1,2].map(col => (
          <div key={col} className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <Skeleton.ScheduleRow key={i} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Error state ─────────────────────────────────────────────────────────
  if (error && !data) return (
    <div className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-6 md:px-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full border-l-4 border-l-red-500">
        <CardHeader divider className="bg-red-50">
          <CardTitle subtitle="Could not load your dashboard data">Dashboard Unavailable</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-700">{error}</p>
          <Button onClick={load}>Retry</Button>
        </CardBody>
      </Card>
    </div>
  );


  // ── Derived stats ────────────────────────────────────────────────────────
  const unmarkedCount = classrooms.filter(c => !todayAttMap[c.id]?.marked).length;
  const realAttRate = data?.attendance_rate ?? 0;
  const pendingGrades = data?.pending_grades ?? 0;
  const totalGrades = data?.total_grades ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="page-bottom-safe max-w-[1800px] mx-auto min-h-0 bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6"
    >
      <SchoolHeaderBanner user={user} today={today} />

      <QuickAccessLinks role="teacher" variant="grid" />

      {/* ── QUICK ACTIONS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
        <button
          onClick={() => navigate('/announcements')}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <span className="truncate">Post Announcement</span>
        </button>
        <button
          onClick={() => navigate('/my-classes')}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="truncate">Mark Attendance</span>
        </button>
        <button
          onClick={() => navigate('/my-classes')}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="truncate">Input Grades</span>
        </button>
        <button
          onClick={() => navigate('/my-classes?view=quizzes')}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="truncate">Quizzes</span>
        </button>
        <button
          onClick={() => navigate('/my-classes?view=lesson-plans')}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate">Lesson Plans</span>
        </button>
        <button
          onClick={() => navigate('/my-classes?view=analytics')}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="truncate">Analytics</span>
        </button>
        {notifUnread > 0 && (
          <button
            onClick={() => navigate('/notifications')}
            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-lg hover:bg-rose-100 transition-colors col-span-3 md:col-span-6"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifUnread} unread
          </button>
        )}
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">Overview</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">

          <StatCard
            label="My Classes" value={classrooms.length} sub="Active"
            icon={<svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            color="blue" onClick={() => navigate('/my-classes')}
          />

          <StatCard
            label="Students" value={data?.total_students || 0} sub="Enrolled"
            icon={<svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            color="emerald" onClick={() => navigate('/my-classes')}
          />

          <StatCard
            label="Attendance"
            value={`${realAttRate}%`}
            sub={`${unmarkedCount > 0 ? `${unmarkedCount} unmarked` : 'All marked'}`}
            icon={<svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color={realAttRate < 75 ? 'rose' : realAttRate < 85 ? 'amber' : 'emerald'}
            onClick={() => navigate('/my-classes')}
            badge={unmarkedCount}
          />

          <StatCard
            label="Pending Grades" value={pendingGrades}
            sub={pendingGrades > 0 ? 'Missing grades' : 'All submitted'}
            icon={<svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
            color={pendingGrades > 0 ? 'rose' : 'emerald'}
            onClick={() => navigate('/grade-input')}
            badge={pendingGrades > 0 ? pendingGrades : undefined}
          />

          <StatCard
            label="Grades" value={totalGrades}
            sub="Total records"
            icon={<svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            color="sky"
            onClick={() => navigate('/my-classes')}
          />
        </div>
      </div>

      {/* ── MY CLASSES CARD ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader divider>
          <div className="flex items-center justify-between">
            <CardTitle subtitle="Teaching sections">My Classes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/my-classes')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {classrooms.length === 0 ? (
            <EmptyState
              title="No classes assigned"
              description="Your teaching sections will appear here"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {classrooms.map(c => {
                const att = todayAttMap[c.id];
                const marked = att?.marked ?? false;
                const attRate = att?.totalCount > 0
                  ? Math.round((att.presentCount / att.totalCount) * 100)
                  : null;
                const codes = classroomSubjectCodes[c.id] || [];
                const avgGrade = classGrades[c.id];

                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/my-classes?classroom=${c.id}`)}
                    className="p-4 text-left rounded-md border-2 border-slate-200 bg-white hover:border-violet-400 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                          {c.name}
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {codes.length > 0
                            ? codes.slice(0, 3).map(code => (
                                <span key={code} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 uppercase tracking-wide">
                                  {code}
                                </span>
                              ))
                            : <span className="text-xs font-semibold text-slate-400">General</span>
                          }
                          {codes.length > 3 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              +{codes.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={marked ? 'green' : 'gold'} size="sm">
                        {marked ? '✓' : '!'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        <span>{c.student_count || 0} students</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {avgGrade != null && (
                          <span className={`text-xs font-bold ${avgGrade >= 75 ? 'text-emerald-600' : avgGrade >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            Avg {avgGrade}
                          </span>
                        )}
                        {attRate !== null && (
                          <span className={`text-xs font-bold ${attRate >= 85 ? 'text-emerald-600' : attRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                            {attRate}%
                          </span>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-violet-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── SCHEDULE & MESSAGES ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <TodayScheduleWidget navigate={navigate} />

        {/* Recent Messages */}
        <Card>
          <CardHeader divider>
            <div className="flex items-center justify-between">
              <CardTitle subtitle="Recent conversations">Messages</CardTitle>
              <button
                onClick={() => navigate('/communication-center')}
                className="text-xs font-bold text-violet-600 hover:text-violet-700 uppercase tracking-wide"
              >
                Open Chat
              </button>
            </div>
          </CardHeader>
          <CardBody>
            {(!data?.latest_messages || data.latest_messages.length === 0) ? (
              <EmptyState
                title="No messages yet"
                description="Start a conversation from the Communication Center"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }
              />
            ) : (
              <div className="space-y-1">
                {data.latest_messages.map(msg => (
                  <button
                    key={msg.id}
                    onClick={() => navigate('/communication-center')}
                    className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden">
                      {msg.sender_profile_picture ? (
                        <img src={msg.sender_profile_picture} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        (msg.sender || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{msg.sender}</p>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">{formatMessageTime(msg.timestamp)}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{typeof msg.content === 'string' ? msg.content : ''}</p>
                    </div>
                    {!msg.is_read && (
                      <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── ACTIVITY FEED ────────────────────────────────────────────────── */}
      {data?.recent_activities && data.recent_activities.length > 0 && (
        <Card>
          <CardHeader divider>
            <CardTitle subtitle="Recent actions">Activity Feed</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {data.recent_activities.map((activity, idx) => {
                const icon = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.system;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-md ${icon.bg} ${icon.text} flex items-center justify-center shrink-0`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 leading-relaxed">{activity.message}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── PENDING REMINDERS ────────────────────────────────────────────── */}
      {(unmarkedCount > 0 || pendingGrades > 0) && (
        <div className="space-y-3">
          {unmarkedCount > 0 && (
            <Card className="border-l-4 border-l-amber-500 bg-amber-50">
              <CardBody className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-extrabold text-slate-900">Attendance Reminder</h3>
                    <p className="text-xs text-slate-700 mt-1">
                      <span className="font-bold text-amber-700">{unmarkedCount} {unmarkedCount === 1 ? 'class' : 'classes'}</span> with unmarked attendance today.
                    </p>
                    <Button variant="primary" size="sm" onClick={() => navigate('/my-classes')} className="mt-3">
                      Mark Attendance
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {pendingGrades > 0 && (
            <Card className="border-l-4 border-l-rose-500 bg-rose-50">
              <CardBody className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-extrabold text-slate-900">Grade Submission Reminder</h3>
                    <p className="text-xs text-slate-700 mt-1">
                      <span className="font-bold text-rose-700">{pendingGrades} student{pendingGrades !== 1 ? 's' : ''}</span> are still missing grades across your subjects.
                    </p>
                    <Button variant="primary" size="sm" onClick={() => navigate('/my-classes')} className="mt-3">
                      Submit Grades
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

    </motion.div>
  );
};

export default TeacherDashboard;
