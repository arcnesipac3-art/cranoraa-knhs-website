import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import apiCache from '../../utils/apiCache';

import { Skeleton } from '../../components/ui';

import WelcomeBanner from '../../components/dashboard/WelcomeBanner';
import QuickActionCards from '../../components/dashboard/QuickActionCards';
import EnhancedStats from '../../components/dashboard/EnhancedStats';
import TodaySchedulePanel from '../../components/dashboard/TodaySchedulePanel';
import AnnouncementsFeed from '../../components/dashboard/AnnouncementsFeed';
import CommunicationWidget from '../../components/dashboard/CommunicationWidget';
import PendingTasksPanel from '../../components/dashboard/PendingTasksPanel';
import StudentAlerts from '../../components/dashboard/StudentAlerts';
import CalendarWidget from '../../components/dashboard/CalendarWidget';
import AnalyticsSnapshot from '../../components/dashboard/AnalyticsSnapshot';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import MyClassesWidget from '../../components/dashboard/MyClassesWidget';

// ── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ label, children, className = '' }) => (
  <div className={className}>
    {label && (
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 px-0.5">{label}</p>
    )}
    {children}
  </div>
);

// ── Skeleton tiles ───────────────────────────────────────────────────────────
const Pulse = ({ className }) => (
  <Skeleton className={className} />
);

const getLocalDateStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { unreadCount: notifUnread } = useNotifications();

  const [data, setData]               = useState(null);
  const [classrooms, setClassrooms]   = useState([]);
  const [subjects, setSubjects]       = useState([]);
  const [todayAttMap, setTodayAttMap] = useState({});
  const [classGrades, setClassGrades] = useState({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [usingCache, setUsingCache]   = useState(false);

  const classroomSubjectCodes = useMemo(() => {
    const map = {};
    subjects.forEach(s => {
      const id = s.classroom;
      if (!map[id]) map[id] = [];
      if (s.subject_code && !map[id].includes(s.subject_code)) map[id].push(s.subject_code);
    });
    return map;
  }, [subjects]);

  const classroomIds = useMemo(() => classrooms.map(c => c.id), [classrooms]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const today = getLocalDateStr();
    const ck = (url) => `${url}?_date=${today}`;

    const cached = {
      stats: apiCache.get(ck('/teacher/stats/')),
      classrooms: apiCache.get('/classrooms/'),
      subjects: apiCache.get(ck(`/classroom-subjects/by_teacher/?teacher_id=${user?.id}`)),
    };

    if (cached.stats || cached.classrooms) {
      if (cached.stats) setData(cached.stats);
      if (cached.classrooms) setClassrooms(cached.classrooms);
      if (cached.subjects) setSubjects(cached.subjects);
      setUsingCache(true);
      setLoading(false);
    }

    try {
      const [statsRes, clsRes, subjectsRes, attRes] = await Promise.all([
        api.get('/teacher/stats/'),
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
        if (['present', 'late'].includes(rec.status)) attMap[cid].presentCount += 1;
      });
      setTodayAttMap(attMap);

      if (cls.length > 0) {
        const clsIds = cls.map(c => c.id).join(',');
        const gradeRes = await api.get(`/grades/summary/?classrooms=${clsIds}`).catch(() => ({ data: null }));
        const gMap = {};
        if (gradeRes.data && typeof gradeRes.data === 'object') {
          Object.entries(gradeRes.data).forEach(([cid, d]) => {
            if (d?.average != null) gMap[Number(cid)] = Math.round(d.average);
          });
        }
        setClassGrades(gMap);
      }

      apiCache.set(ck('/teacher/stats/'), statsRes.data, 60 * 60 * 1000);
      apiCache.set('/classrooms/', clsRes.data, 60 * 60 * 1000);
      apiCache.set(ck(`/classroom-subjects/by_teacher/?teacher_id=${user?.id}`), subjectsRes.data, 60 * 60 * 1000);
      setUsingCache(false);
    } catch {
      const hasCache = cached.stats || cached.classrooms;
      if (!hasCache) setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5"
      aria-busy="true" aria-label="Loading dashboard…">
      <Pulse className="h-28 md:h-32" />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => <Pulse key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => <Pulse key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Pulse key={i} className="h-48" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => <Pulse key={i} className="h-64" />)}
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && !data) return (
    <div className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-6 md:px-6 flex items-center justify-center min-h-[60vh]">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-red-200 border-l-4 border-l-red-500 shadow-sm p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-sm font-extrabold text-slate-900 mb-1">Dashboard Unavailable</h3>
        <p className="text-xs text-slate-600 mb-4">{error}</p>
        <button onClick={load}
          className="px-5 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const unmarkedCount = classrooms.filter(c => !todayAttMap[c.id]?.marked).length;
  const pendingGrades = data?.pending_grades ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-3 py-4 md:px-6 md:py-5 space-y-5 md:space-y-6"
    >
      {/* Cache stale notice */}
      {usingCache && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Showing cached data. Live data loading…
        </div>
      )}

      {/* 1. WELCOME */}
      <WelcomeBanner user={user} classrooms={classrooms} data={data} />

      {/* 2. QUICK ACTIONS */}
      <Section label="Quick Actions">
        <QuickActionCards pendingGrades={pendingGrades} unmarkedCount={unmarkedCount} />
      </Section>

      {/* 3. OVERVIEW STATS */}
      <EnhancedStats
        classrooms={classrooms} data={data}
        todayAttMap={todayAttMap} classGrades={classGrades}
        unmarkedCount={unmarkedCount}
      />

      {/* 4. MY CLASSES */}
      <Section label="My Classes">
        <MyClassesWidget
          classrooms={classrooms} todayAttMap={todayAttMap}
          classroomSubjectCodes={classroomSubjectCodes} classGrades={classGrades}
        />
      </Section>

      {/* 5. SCHEDULE · ANNOUNCEMENTS · MESSAGES */}
      <Section label="Today at a Glance">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <TodaySchedulePanel />
          <AnnouncementsFeed />
          <CommunicationWidget messages={data?.latest_messages} notifUnread={notifUnread} />
        </div>
      </Section>

      {/* 6. TASKS · ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <PendingTasksPanel
          unmarkedCount={unmarkedCount} pendingGrades={pendingGrades}
          classrooms={classrooms} todayAttMap={todayAttMap}
        />
        <StudentAlerts />
      </div>

      {/* 7. CALENDAR · ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <CalendarWidget />
        <AnalyticsSnapshot classroomIds={classroomIds} />
      </div>

      {/* 8. ACTIVITY FEED */}
      <ActivityFeed activities={data?.recent_activities} />

    </motion.div>
  );
};

export default TeacherDashboard;
