import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import apiCache from '../../utils/apiCache';
import { useAuth } from '../../context/AuthContext';
import { useOfflineMode } from '../../hooks/useBackendStatus';
import {
  Card, CardHeader, CardBody, CardTitle, Button, Badge,
  Skeleton, EmptyState,
} from '../../components/ui';
import QuickAccessLinks from '../../components/dashboard/QuickAccessLinks';
import GradeRadarChart from '../../components/dashboard/GradeRadarChart';
import { SchoolHeaderBanner, StatCard, TodayScheduleWidget } from './shared';
import {
  Download, FileCheck, TrendingUp, AlertTriangle,
} from 'lucide-react';

/**
 * Student Dashboard - DepEd Government Education Style
 * Professional academic dashboard for students
 */

const getLocalDateStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const isWeekend = (dateStr) => {
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day === 0 || day === 6;
};

const computeStreak = (records) => {
  if (!Array.isArray(records) || records.length === 0) return { streak: 0, hasData: false };
  const weekdayRecords = records
    .filter((r) => r.date && !isWeekend(r.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (weekdayRecords.length === 0) return { streak: 0, hasData: false };
  let streak = 0;
  for (const r of weekdayRecords) {
    if (['present', 'late'].includes(r.status)) streak++;
    else break;
  }
  return { streak, hasData: true };
};

const gradeScore = (g) => parseFloat(g.raw_score ?? 0);

const formatDue = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((d - now) / 86400000);
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatFeedTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffHours = Math.floor((Date.now() - date) / 3600000);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOfflineMode, isStaleData } = useOfflineMode();
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState([]);
  const [messages, setMessages] = useState(null);
  const [usingCache, setUsingCache] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const r = await api.get('/chat/rooms/?limit=5');
      const rooms = Array.isArray(r.data) ? r.data : r.data?.results || [];
      setMessages(rooms);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    const endpoints = [
      { key: 'grades', url: '/grades/my_grades/' },
      { key: 'attendance', url: '/attendance/' },
      { key: 'stats', url: '/student/dashboard/stats/' },
      { key: 'assignments', url: '/assignments/' },
      { key: 'announcements', url: '/announcements/' },
      { key: 'schedule', url: '/schedules/today/' },
      { key: 'classrooms', url: '/classrooms/' },
    ];

    // 1. Load from cache immediately
    let hasCache = false;
    const cached = {};
    for (const { key, url } of endpoints) {
      const c = apiCache.get(url);
      if (c) { cached[key] = c; hasCache = true; }
    }
    if (hasCache) {
      setGrades(cached.grades || []);
      setAttendance(cached.attendance || []);
      setStats(cached.stats || null);
      setAssignments(cached.assignments || []);
      setAnnouncements(cached.announcements || []);
      setSchedule(cached.schedule || []);
      setClassrooms(cached.classrooms || []);
      setUsingCache(true);
      setLoading(false);
    }

    // 2. Fetch from network
    Promise.all(endpoints.map(({ url }) =>
      api.get(url).catch(() => ({ data: url.includes('stats') ? {} : [] }))
    )).then((results) => {
      if (!results?.length) return;
      setGrades(results[0]?.data || []);
      setAttendance(results[1]?.data || []);
      setStats(results[2]?.data || {});
      setAssignments(Array.isArray(results[3]?.data) ? results[3].data : results[3]?.data?.results || []);
      setAnnouncements(Array.isArray(results[4]?.data) ? results[4].data : results[4]?.data?.results || []);
      setSchedule(results[5]?.data || []);
      const cls = Array.isArray(results[6]?.data) ? results[6].data : results[6]?.data?.results || [];
      setClassrooms(cls);
      setUsingCache(false);

      // 3. Update cache
      endpoints.forEach(({ key, url }, i) => {
        apiCache.set(url, results[i]?.data, 60 * 60 * 1000);
      });
    }).catch(() => {}).finally(() => setLoading(false));

    loadMessages();
  }, [loadMessages]);

  // ── Fix 1: inline skeleton instead of full-page spinner ──────────────────
  if (loading) return (
    <div className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6"
      aria-busy="true" aria-label="Loading dashboard…">
      {/* Welcome banner */}
      <Skeleton className="h-36 md:h-32 w-full rounded-xl" />
      {/* Role manual */}
      <Skeleton className="h-12 w-full rounded-lg" />
      {/* Quick access tiles */}
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3,4,5,6].map(i => <Skeleton.QuickTile key={i} />)}
      </div>
      {/* Row 1: schedule (6) | attendance (3) | grades (3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
        <div className="lg:col-span-6 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <Skeleton.ScheduleRow key={i} />)}</div>
        </div>
        {[1,2].map(col => (
          <div key={col} className="lg:col-span-3 rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-16 w-full rounded-md" />
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3].map(i => <Skeleton className="h-14 rounded-md" key={i} />)}
            </div>
          </div>
        ))}
      </div>
      {/* Row 2: subject performance (8) | upcoming (4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
        <div className="lg:col-span-8 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <div className="p-4 space-y-2">{[1,2,3,4,5,6].map(i => <Skeleton className="h-12 w-full rounded-md" key={i} />)}</div>
        </div>
        <div className="lg:col-span-4 rounded-lg border border-slate-200 bg-white">
          <div className="p-4 border-b border-slate-100"><Skeleton className="h-4 w-24 rounded" /></div>
          <div className="p-4 space-y-2">{[1,2,3,4].map(i => <Skeleton.AnnouncementRow key={i} />)}</div>
        </div>
      </div>
      {/* Row 3: announcements | messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {[1,2].map(col => (
          <div key={col} className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
            <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton.AnnouncementRow key={i} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const validAtt = Array.isArray(attendance) ? attendance.filter((r) => !isWeekend(r.date)) : [];
  const presentCount = validAtt.filter((r) => r.status === 'present').length;
  const lateCount = validAtt.filter((r) => r.status === 'late').length;
  const absentCount = validAtt.filter((r) => r.status === 'absent').length;
  const totalPresentForRate = validAtt.filter((r) => ['present', 'late'].includes(r.status)).length;
  // Fix 4: require ≥5 weekday records before showing a percentage to avoid
  // misleading 100% when only 1–2 records exist at the start of the school year.
  const attRate = validAtt.length >= 5
    ? Math.round((totalPresentForRate / validAtt.length) * 100)
    : null;
  const attRateDisplay = attRate !== null ? `${attRate}%` : '—';
  const attRateSub = validAtt.length < 5
    ? `${validAtt.length} day${validAtt.length !== 1 ? 's' : ''} recorded`
    : `${validAtt.length} days total`;
  const { streak, hasData: hasAttData } = computeStreak(attendance);

  const todayStr = getLocalDateStr();
  const todayRecord = Array.isArray(attendance) ? attendance.find((r) => r.date === todayStr) : null;
  const todayIsWeekend = isWeekend(todayStr);
  const todayAttLabel = todayIsWeekend
    ? 'Weekend — no class today'
    : !todayRecord
    ? 'Today not marked yet'
    : `Today: ${todayRecord.status.charAt(0).toUpperCase()}${todayRecord.status.slice(1)}`;

  // Calculate grade stats
  const finalGrades = Array.isArray(grades)
    ? grades.filter((g) => g.grade_type === 'final_grade' && g.raw_score != null)
    : [];
  const sortedGrades = [...finalGrades].sort((a, b) => gradeScore(b) - gradeScore(a));
  const overallAvg =
    finalGrades.length > 0
      ? (finalGrades.reduce((s, g) => s + gradeScore(g), 0) / finalGrades.length).toFixed(1)
      : null;
  const topSubject = sortedGrades[0]
    ? { name: sortedGrades[0].subject_name, score: gradeScore(sortedGrades[0]) }
    : null;

  // Get upcoming assignments
  const now = new Date();
  const upcomingAssignments = assignments
    .filter((a) => a.due_date && new Date(a.due_date) >= now)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 6);

  const recentAnnouncements = announcements.slice(0, 5);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

// Schedule helpers
  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const currentIdx = schedule.findIndex((s) => {
    const start = toMinutes(s.time_slot_detail?.start_time_display);
    const end = toMinutes(s.time_slot_detail?.end_time_display);
    return nowMinutes >= start && nowMinutes < end;
  });

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6"
    >
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* WELCOME BANNER - SchoolHeaderBanner */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      
      <SchoolHeaderBanner user={user} today={today} />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* QUICK ACCESS LINKS */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      
      <QuickAccessLinks role="student" variant="grid" />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MY ENROLLED CLASS */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {classrooms.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">My Enrolled Class{classrooms.length > 1 ? 'es' : ''}</h2>
            <button onClick={() => navigate('/my-classes')} className="text-xs font-bold text-violet-600 hover:underline">
              Open Classes →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classrooms.map(cls => (
              <button
                key={cls.id}
                onClick={() => navigate(`/my-classes?classroom=${cls.id}`)}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-violet-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                  {cls.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-slate-900 truncate">{cls.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                    {cls.grade_level || 'Classroom'}{cls.teacher_name ? ` · ${cls.teacher_name}` : ''}
                  </p>
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ROW 1: TODAY'S SCHEDULE | ATTENDANCE | GRADES */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
        {/* Today's Classes */}
        <div className="lg:col-span-6">
          <Card className="h-full min-h-[320px] flex flex-col">
            <CardHeader divider>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="flex-1">
                  <CardTitle>Today's Classes</CardTitle>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/my-schedule')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardBody className="flex-1 min-h-0 overflow-auto space-y-2">
              {schedule.length === 0 ? (
                <EmptyState
                  title="No Classes Today"
                  description="Check your full schedule for the week"
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                />
              ) : (
                schedule.map((s, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isPast = currentIdx !== -1 && idx < currentIdx;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 px-3 py-2.5 border rounded-md transition-all ${
                        isCurrent
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : isPast
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200 hover:border-violet-300'
                      }`}
                    >
                      <div className="text-center min-w-[48px]">
                        <p className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                          {s.time_slot_detail?.start_time_display}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                          {s.subject_detail?.name}
                        </p>
                        <p className={`text-xs truncate ${isCurrent ? 'text-violet-100' : 'text-slate-500'}`}>
                          {s.classroom_detail?.name}
                        </p>
                      </div>
                      {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>

        {/* Attendance Summary */}
        <div className="lg:col-span-3">
          <Card className="h-full min-h-[320px] flex flex-col border-l-4 border-l-emerald-500">
            <CardHeader divider>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <CardTitle>Attendance</CardTitle>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">This School Year</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="flex-1 flex flex-col">
              {!hasAttData ? (
                <EmptyState title="No Records Yet" />
              ) : (
                <>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">{attRateDisplay}</p>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">Rate</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{attRateSub}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-violet-600 tabular-nums">{streak}</p>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">Streak</p>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-md mb-3">
                    <p className="text-xs font-semibold text-slate-700">{todayAttLabel}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-auto">
                    <div className="text-center p-2 bg-emerald-50 border border-emerald-200 rounded-md">
                      <p className="text-lg font-extrabold text-emerald-600">{presentCount}</p>
                      <p className="text-xs font-bold text-emerald-700 uppercase">Present</p>
                    </div>
                    <div className="text-center p-2 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-lg font-extrabold text-amber-600">{lateCount}</p>
                      <p className="text-xs font-bold text-amber-700 uppercase">Late</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-lg font-extrabold text-red-600">{absentCount}</p>
                      <p className="text-xs font-bold text-red-700 uppercase">Absent</p>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Grade Summary */}
        <div className="lg:col-span-3">
          <Card className="h-full min-h-[320px] flex flex-col border-l-4 border-l-violet-500">
            <CardHeader divider>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="flex-1">
                  <CardTitle>Grade Summary</CardTitle>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Current Standing</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="flex-1 flex flex-col">
              {!overallAvg ? (
                <EmptyState title="No Grades Posted" description="Grades appear when teachers post them" />
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-3xl font-extrabold text-violet-600 tabular-nums">{overallAvg}</p>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">Current Average</p>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold text-slate-600 uppercase mb-2">
                      <span>Progress</span>
                      <span>{Math.round(parseFloat(overallAvg))}%</span>
                    </div>
                    {/* Fix 5: passing threshold marker at 75% */}
                    <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-visible mb-1">
                      <div
                        className="h-full bg-violet-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, parseFloat(overallAvg))}%` }}
                      />
                      {/* 75% passing line */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-amber-500 rounded-full"
                        style={{ left: '75%' }}
                        title="Passing threshold (75)"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>0</span>
                      <span className="text-amber-500">75 passing</span>
                      <span>100</span>
                    </div>
                  </div>
                  {topSubject && (
                    <div className="flex justify-between items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 mt-auto">
                      <span className="text-xs font-semibold text-slate-700 truncate">Top: {topSubject.name}</span>
                      <span className="text-sm font-extrabold text-emerald-600">{topSubject.score}</span>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ROW 2: SUBJECT PERFORMANCE | UPCOMING ACTIVITIES */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
        {/* Subject Performance */}
        <div className="lg:col-span-8">
          <Card className="h-full min-h-[320px] flex flex-col">
            <CardHeader divider>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <div className="flex-1">
                  <CardTitle>Subject Performance</CardTitle>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Current Grades by Subject</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/my-classes')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardBody className="flex-1 min-h-0 overflow-auto space-y-2">
              {finalGrades.length === 0 ? (
                <EmptyState title="No Subjects Graded Yet" />
              ) : (
                <>
                  {finalGrades.length >= 3 && (
                    <div className="px-2 py-1">
                      <GradeRadarChart
                        data={finalGrades.map(g => ({ subject: g.subject_name, score: gradeScore(g) }))}
                        height={180}
                      />
                    </div>
                  )}
                  {finalGrades.slice(0, 8).map((g) => {
                    const score = gradeScore(g);
                    const barColor = score >= 90 ? 'bg-emerald-500' : score >= 75 ? 'bg-violet-500' : 'bg-red-500';
                    const textColor = score >= 90 ? 'text-emerald-600' : score >= 75 ? 'text-violet-600' : 'text-red-600';
                    return (
                      <div
                        key={g.id}
                        className="px-3 py-2.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 hover:border-violet-300 cursor-pointer transition-all"
                        onClick={() => navigate('/my-classes')}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{g.subject_name}</p>
                          <span className={`text-lg font-extrabold tabular-nums ${textColor}`}>{score}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, score)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {/* Fix 3: overflow indicator */}
                  {finalGrades.length > 8 && (
                    <button
                      onClick={() => navigate('/my-classes')}
                      className="w-full py-2 text-xs font-bold text-violet-600 hover:text-violet-700 text-center border border-dashed border-violet-200 rounded-md hover:bg-violet-50 transition-colors"
                    >
                      + {finalGrades.length - 8} more subject{finalGrades.length - 8 !== 1 ? 's' : ''} — View All
                    </button>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Upcoming Activities */}
        <div className="lg:col-span-4">
          <Card className="h-full min-h-[320px] flex flex-col">
            <CardHeader divider>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <CardTitle>Upcoming</CardTitle>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Assignments & Deadlines</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="flex-1 min-h-0 overflow-auto space-y-2">
              {upcomingAssignments.length === 0 ? (
                <EmptyState title="No Upcoming Deadlines" description="New assignments will show here" />
              ) : (
                upcomingAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="px-3 py-2.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 hover:border-violet-300 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{a.title}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {a.subject_name} · {a.classroom_name}
                        </p>
                      </div>
                      <Badge
                        variant={formatDue(a.due_date) === 'Overdue' ? 'red' : 'amber'}
                        size="sm"
                        className="shrink-0"
                      >
                        {formatDue(a.due_date)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ROW 3: QUICK SERVICES - SF9, Certificates, Progress */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Download SF9 */}
        <button
          onClick={() => navigate('/my-classes?view=grades')}
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-teal-300 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white flex-shrink-0">
            <Download size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-900">Download SF9</p>
            <p className="text-xs text-slate-500 truncate">Report Card (PDF)</p>
          </div>
        </button>

        {/* Request Certificate */}
        <button
          onClick={() => navigate('/my-classes?tab=records')}
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-orange-300 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white flex-shrink-0">
            <FileCheck size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-900">Request Certificate</p>
            <p className="text-xs text-slate-500 truncate">Character / Transfer Cert</p>
          </div>
        </button>

        {/* Academic Progress */}
        <button
          onClick={() => navigate('/my-classes?view=grades')}
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-violet-300 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white flex-shrink-0">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-900">My Progress</p>
            <p className="text-xs text-slate-500 truncate">Academic Overview</p>
          </div>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ROW 4: ANNOUNCEMENTS | MESSAGES */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Announcements */}
        <Card className="min-h-[280px] flex flex-col">
          <CardHeader divider>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <div className="flex-1">
                <CardTitle>Announcements</CardTitle>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">School & Class Updates</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/announcements')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardBody className="flex-1 min-h-0 overflow-auto space-y-2">
            {recentAnnouncements.length === 0 ? (
              <EmptyState title="No Announcements" />
            ) : (
              recentAnnouncements.map((a) => (
                <div
                  key={a.id}
                  className="px-3 py-2.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 hover:border-violet-300 cursor-pointer transition-all"
                  onClick={() => navigate('/announcements')}
                >
                  <p className="text-sm font-bold text-slate-900 line-clamp-1">{a.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{a.content}</p>
                  <p className="text-xs font-semibold text-violet-600 mt-2">{formatFeedTime(a.created_at)}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Messages */}
        <Card className="min-h-[280px] flex flex-col">
          <CardHeader divider>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div className="flex-1">
                <CardTitle>Messages</CardTitle>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  {stats?.unread_notifications > 0
                    ? `${stats.unread_notifications} unread`
                    : 'Recent Conversations'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/communication-center')}>
                Open Inbox
              </Button>
            </div>
          </CardHeader>
          <CardBody className="flex-1 min-h-0 overflow-auto space-y-2">
            {messages === null ? (
              /* Independent loading state — doesn't block the rest of the dashboard */
              <div className="space-y-2" aria-busy="true" aria-label="Loading messages…">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-2.5 p-3 rounded-md border border-slate-100">
                    <Skeleton className="w-9 h-9 rounded-md shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-24 rounded" />
                      <Skeleton className="h-2.5 w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length > 0 ? (
              messages.map((m) => {
                // Safely extract display fields from either a chat room or a raw message object
                const displayName = typeof m.sender_name === 'string' ? m.sender_name
                  : typeof m.name === 'string' ? m.name
                  : typeof m.sender === 'string' ? m.sender
                  : 'Conversation';
                const displayInitial = displayName[0]?.toUpperCase() || '?';
                const displayTime = m.last_message_at || m.timestamp || null;
                const rawContent = m.last_message || m.content || '';
                const displayContent = typeof rawContent === 'string' ? rawContent : 'No messages yet';
                return (
                  <div
                    key={m.id}
                    className="flex gap-2.5 px-3 py-2.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 hover:border-violet-300 cursor-pointer transition-all"
                    onClick={() => navigate('/communication-center')}
                  >
                    <div className="w-9 h-9 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-extrabold shrink-0">
                      {displayInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                        {displayTime && (
                          <span className="text-xs text-slate-400 shrink-0">
                            {new Date(displayTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{displayContent}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No Messages Yet" description="Start a conversation from the inbox" />
            )}
          </CardBody>
        </Card>
      </div>
    </motion.div>
  );
};

export default StudentDashboard;
