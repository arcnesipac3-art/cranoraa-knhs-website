import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Skeleton } from '../components/ui';
import QuickAccessLinks from '../components/dashboard/QuickAccessLinks';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_FULL = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday' };

const AttBadge = ({ status }) => {
  const cfg = {
    present: 'bg-emerald-100 text-emerald-700',
    late:    'bg-amber-100 text-amber-700',
    absent:  'bg-rose-100 text-rose-700',
    excused: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold tracking-[0.1em] ${cfg[status] || 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
};

const GradeBadge = ({ score }) => {
  if (score == null) return <span className="text-slate-400">—</span>;
  const color = score >= 90 ? 'text-emerald-600' : score >= 85 ? 'text-violet-600' : score >= 80 ? 'text-violet-600' : score >= 75 ? 'text-amber-600' : 'text-rose-600';
  return <span className={`font-bold text-sm ${color}`}>{score}</span>;
};

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childDetail, setChildDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/parent/dashboard/');
      setData(r.data);
      if (r.data.children?.length > 0) {
        setSelectedChild(r.data.children[0]);
      }
    } catch (err) {
      console.error('Parent dashboard load failed:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard. Please try again.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const fetchChildDetail = useCallback(async (childId) => {
    setDetailLoading(true);
    try {
      const r = await api.get(`/parent/child/${childId}/`);
      setChildDetail(r.data);
    } catch (err) {
      console.error('Child detail load failed:', err);
      // non-fatal — overview data still shows from the summary
    } finally { setDetailLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedChild?.id) fetchChildDetail(selectedChild.id);
  }, [selectedChild?.id, fetchChildDetail]);

  if (loading) return (
    <div className="space-y-4 md:space-y-6 page-bottom-safe max-w-[1800px] mx-auto px-4 py-4 md:px-6 md:py-6"
      aria-busy="true" aria-label="Loading dashboard…">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <Skeleton.QuickTile key={i} />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton.StatCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <Skeleton className="h-4 w-28 rounded" />
            {[1,2,3].map(j => <Skeleton.ScheduleRow key={j} />)}
          </div>
        ))}
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="page-bottom-safe flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-red-200 border-l-4 border-l-red-500 p-6 space-y-4">
        <div>
          <p className="text-sm font-bold text-red-900">Dashboard Unavailable</p>
          <p className="text-xs text-slate-600 mt-1">{error}</p>
        </div>
        <button onClick={fetchDashboard}
          className="px-4 py-2 text-xs font-bold bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );

  const children = data?.children || [];
  const announcements = data?.announcements || [];
  const child = selectedChild;
  const detail = childDetail;

  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  return (
    <div className="space-y-4 md:space-y-6 page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 overflow-x-hidden">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-xl p-5 md:p-6 border border-violet-700 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-violet-200 tracking-[0.1em]">{today}</p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
              Welcome, <span className="text-violet-100">{user?.first_name || 'Parent'}</span>
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                {children.length} Linked {children.length === 1 ? 'Child' : 'Children'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold">
                Parent Portal
              </span>
            </div>
          </div>
          <button
            onClick={fetchDashboard}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/20 transition-all"
            title="Refresh dashboard">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Access Links */}
      <QuickAccessLinks role="parent" variant="grid" />

      {children.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <p className="text-slate-500 font-bold text-sm">No linked students found.</p>
          <p className="text-slate-400 text-xs mt-1">Please contact the school administrator to link your children to your account.</p>
        </div>
      ) : (
        <>
          {/* Child Selector — always show for multi-child; show name chip for single child */}
          {children.length > 1 ? (
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 scroll-x -mx-0.5 px-0.5">
              {children.map(c => (
                <button key={c.id} onClick={() => { setSelectedChild(c); setActiveTab('overview'); }}
                  className={`flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border transition-all min-h-[44px] ${
                    selectedChild?.id === c.id
                      ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300'
                  }`}>
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs overflow-hidden ${selectedChild?.id === c.id ? 'bg-white/20' : 'bg-violet-100 text-violet-600'}`}>
                    {c.profile_picture
                      ? <img src={c.profile_picture} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold leading-none">{c.first_name} {c.last_name}</p>
                    <p className={`text-xs font-bold mt-0.5 ${selectedChild?.id === c.id ? 'text-violet-200' : 'text-slate-400'}`}>{c.grade_level || 'Student'}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : child && (
            /* Single child — show their name so context is clear */
            <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-lg w-fit">
              <div className="w-9 h-9 rounded-md bg-violet-200 text-violet-700 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                {child.profile_picture
                  ? <img src={child.profile_picture} alt="" className="w-full h-full object-cover" loading="lazy" />
                  : `${child.first_name?.[0] || ''}${child.last_name?.[0] || ''}`}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-none">{child.first_name} {child.last_name}</p>
                <p className="text-xs font-bold text-violet-600 mt-0.5">{child.grade_level || 'Student'} · {child.classroom_name || ''}</p>
              </div>
            </div>
          )}

          {child && (
            <>
              {/* Quick Stats for selected child */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-all border-l-4 border-l-emerald-500">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-2 sm:mb-3">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" /></svg>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-[0.1em]">Attendance</p>
                  <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{child.attendance_rate != null ? `${child.attendance_rate}%` : '—'}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-2">{child.attendance_present}/{child.attendance_total} days this month</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-all border-l-4 border-l-violet-500">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-2 sm:mb-3">
                    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-[0.1em]">General Average</p>
                  <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{child.general_average ?? '—'}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{child.grades?.length || 0} subjects graded</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-all border-l-4 border-l-sky-500">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-50 flex items-center justify-center mb-2 sm:mb-3">
                    <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-[0.1em]">Classroom</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 sm:mt-1 truncate">{child.classroom_name || '—'}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">Adviser: {child.adviser_name || '—'}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-all border-l-4 border-l-amber-500">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-2 sm:mb-3">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-[0.1em]">Alerts</p>
                  <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{child.recent_notifications?.length || 0}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Unread notices</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto scroll-x">
                {[
                  { id:'overview', label:'Overview' },
                  { id:'grades', label:'Grades' },
                  { id:'attendance', label:'Attendance' },
                  { id:'schedule', label:'Schedule' },
                  { id:'assignments', label:'Assignments' },
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-[0.1em] transition-all min-h-[40px] ${
                      activeTab === t.id ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  {/* Today's Schedule — Fix 5: prefer detail source for consistency with Schedule tab */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 md:p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight mb-4">Today's Classes</h3>
                    {detailLoading ? (
                      <div className="space-y-2">{[1,2,3].map(i => <Skeleton.ScheduleRow key={i} />)}</div>
                    ) : (() => {
                      const todaySchedule = detail?.today_schedule ?? child.today_schedule ?? [];
                      return todaySchedule.length === 0
                        ? <p className="text-slate-400 text-xs py-4 text-center">No classes today</p>
                        : todaySchedule.map((s, i) => (
                          <div key={i} className="flex gap-3 p-3 rounded-md bg-slate-50 mb-2">
                            <div className="text-center min-w-[52px]">
                              <p className="text-xs font-bold text-violet-600">{s.start_time}</p>
                              <p className="text-xs text-slate-400">{s.end_time}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{s.subject}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {s.teacher}
                                {s.room && (
                                  <span className="inline-flex items-center gap-1 ml-1">
                                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {s.room}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        ));
                    })()}
                  </div>

                  {/* Recent Attendance */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 md:p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight mb-4">Recent Attendance</h3>
                    {child.recent_attendance?.length === 0 ? (
                      <p className="text-slate-400 text-xs py-4 text-center">No attendance records</p>
                    ) : (
                      <div className="space-y-2">
                        {child.recent_attendance?.map((r, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                            <p className="text-xs font-medium text-slate-700">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}</p>
                            <AttBadge status={r.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Grades */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 md:p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight mb-4">Recent Grades</h3>
                    {child.grades?.length === 0 ? (
                      <p className="text-slate-400 text-xs py-4 text-center">No grades yet</p>
                    ) : (
                      <div className="space-y-2">
                        {child.grades?.slice(0, 6).map((g, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{g.subject_name}</p>
                               <p className="text-xs text-slate-400">T{g.quarter} · {g.subject_code}</p>
                            </div>
                            <div className="text-right">
                              <GradeBadge score={g.score} />
                              <p className="text-xs text-slate-400 mt-0.5">{g.remarks}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notifications */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 md:p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight mb-4">Recent Alerts</h3>
                    {child.recent_notifications?.length === 0 ? (
                      <p className="text-slate-400 text-xs py-4 text-center">No new alerts</p>
                    ) : child.recent_notifications?.map((n, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-md bg-slate-50 mb-2">
                        <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                          n.type === 'grade' ? 'bg-violet-100 text-violet-600' :
                          n.type === 'attendance' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {n.type === 'grade' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          ) : n.type === 'attendance' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'grades' && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">Grade Report</h3>
                    {child.general_average && (
                      <p className="text-slate-500 text-xs mt-1">General Average: <span className="font-bold text-violet-600">{child.general_average}</span></p>
                    )}
                  </div>
                  {detailLoading ? (
                    <div className="p-4 space-y-2" aria-busy="true" aria-label="Loading grades…">
                      {[1,2,3,4,5].map(i => <Skeleton.ScheduleRow key={i} />)}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-separate border-spacing-0 min-w-[480px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 tracking-[0.1em]">Subject</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 tracking-[0.1em] hidden sm:table-cell">Code</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 tracking-[0.1em]">Quarter</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 tracking-[0.1em]">Score</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 tracking-[0.1em] hidden sm:table-cell">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(detail?.grades || child.grades || []).length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">No grades recorded yet.</td></tr>
                          ) : (detail?.grades || child.grades || []).map((g, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-xs font-bold text-slate-800">{g.subject_name}</td>
                              <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{g.subject_code}</td>
                               <td className="px-4 py-3 text-xs text-slate-600">T{g.quarter}</td>
                              <td className="px-4 py-3"><GradeBadge score={g.score} /></td>
                              <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{g.remarks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">Attendance History</h3>
                    {child.attendance_rate != null && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${child.attendance_rate >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {child.attendance_rate}% This Month
                      </span>
                    )}
                  </div>
                  {detailLoading ? (
                    <div className="p-4 space-y-2" aria-busy="true" aria-label="Loading attendance…">
                      {[1,2,3,4,5].map(i => <Skeleton.ScheduleRow key={i} />)}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-separate border-spacing-0 min-w-[360px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 tracking-[0.1em]">Date</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 tracking-[0.1em] hidden sm:table-cell">Day</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 tracking-[0.1em]">Status</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 tracking-[0.1em] hidden sm:table-cell">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(detail?.attendance || child.recent_attendance || []).length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm">No attendance records.</td></tr>
                          ) : (detail?.attendance || child.recent_attendance || []).map((r, i) => {
                            const d = new Date(r.date + 'T00:00:00');
                            return (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-xs font-medium text-slate-700">{d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</td>
                                <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{d.toLocaleDateString('en-US', { weekday:'long' })}</td>
                                <td className="px-4 py-3"><AttBadge status={r.status} /></td>
                                <td className="px-4 py-3 text-xs text-slate-400 hidden sm:table-cell">{r.remarks || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="space-y-4">
                  {detailLoading ? (
                    <div className="space-y-3 p-2" aria-busy="true">
                      {[1,2,3].map(i => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-white">
                          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                            <Skeleton className="h-3 w-20 rounded" />
                          </div>
                          <div className="p-3 space-y-2">
                            {[1,2].map(j => <Skeleton.ScheduleRow key={j} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    DAYS.map(day => {
                      const daySchedule = (detail?.weekly_schedule || []).filter(s => s.day === day);
                      if (daySchedule.length === 0) return null;
                      return (
                        <div key={day} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-bold text-slate-700 tracking-[0.1em]">{DAY_FULL[day]}</p>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {daySchedule.map((s, i) => (
                              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3">
                                <div className="flex sm:block items-center gap-3 sm:text-center sm:min-w-[60px]">
                                  <p className="text-xs font-bold text-violet-600">{s.start_time}</p>
                                  <p className="text-xs text-slate-400 sm:mt-0">– {s.end_time}</p>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{s.subject}</p>
                                  <p className="text-xs text-slate-500 truncate">Teacher: {s.teacher}</p>
                                  {s.room && <p className="text-xs text-slate-400 sm:hidden mt-0.5 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{s.room}</p>}
                                </div>
                                {s.room && <p className="text-xs text-slate-400 flex-shrink-0 hidden sm:flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{s.room}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {!detailLoading && (detail?.weekly_schedule || []).length === 0 && (
                    <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
                      <p className="text-slate-400 text-sm">No schedule available yet.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'assignments' && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">Assignments</h3>
                  </div>
                  {detailLoading ? (
                    <div className="p-4 space-y-2" aria-busy="true">
                      {[1,2,3,4].map(i => <Skeleton.ScheduleRow key={i} />)}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {(detail?.assignments || []).length === 0 ? (
                        <p className="px-6 py-10 text-center text-slate-400 text-sm">No assignments found.</p>
                      ) : (detail?.assignments || []).map((a, i) => {
                        const due = new Date(a.due_date);
                        const isPast = due < new Date();
                        return (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                            <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-slate-100 text-slate-400' : 'bg-violet-100 text-violet-600'}`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{a.title}</p>
                              <p className="text-xs text-slate-500">{a.subject} · {a.points} pts</p>
                            </div>
                            <div className="flex sm:block items-center justify-between sm:text-right gap-2 sm:gap-0 flex-shrink-0 sm:ml-auto">
                              <p className={`text-xs font-bold ${isPast ? 'text-rose-500' : 'text-emerald-600'}`}>
                                {isPast ? 'Past Due' : 'Due'}
                              </p>
                              <p className="text-xs text-slate-400">{due.toLocaleDateString('en-US', { month:'short', day:'numeric' })}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* School Announcements */}
      {announcements.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-xs font-bold text-slate-900 tracking-tight">School Announcements</h3>
            <button onClick={() => navigate('/announcements')} className="text-[10px] sm:text-xs font-bold text-violet-600 tracking-[0.1em] hover:underline shrink-0">View All</button>
          </div>
          <div className="divide-y divide-slate-50">
            {announcements.map(a => (
              <div key={a.id} className="flex gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold ${a.priority === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-violet-100 text-violet-600'}`}>
                  {new Date(a.created_at).getDate()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{a.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{a.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{a.author_name} · {new Date(a.created_at).toLocaleDateString()}</p>
                </div>
                {a.priority === 'critical' && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-xs font-bold">Critical</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
