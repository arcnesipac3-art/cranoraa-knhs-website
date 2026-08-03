import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Skeleton } from '../components/ui';

const DAYS = ['monday','tuesday','wednesday','thursday','friday'];
const DAY_FULL = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday' };
const DAY_SHORT = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri' };

const COLOR_MAP = [
  'bg-violet-50 border-violet-200 text-violet-700',
  'bg-violet-50 border-violet-200 text-violet-700',
  'bg-emerald-50 border-emerald-200 text-emerald-700',
  'bg-amber-50 border-amber-200 text-amber-700',
  'bg-rose-50 border-rose-200 text-rose-700',
  'bg-indigo-50 border-indigo-200 text-indigo-700',
];

export default function MySchedule() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(() => {
    const d = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return DAYS.includes(d) ? d : 'monday';
  });

  useEffect(() => {
    Promise.all([
      api.get('/schedules/my_schedule/'),
      api.get('/schedules/today/'),
    ]).then(([schRes, todayRes]) => {
      setSchedules(schRes.data);
      setTodaySchedule(todayRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4 px-4 py-6">
      <Skeleton className="h-7 w-40 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-16 rounded" />
            {Array.from({ length: 3 }).map((_, j) => <Skeleton.ScheduleRow key={j} />)}
          </div>
        ))}
      </div>
    </div>
  );

  // Group by day
  const byDay = {};
  DAYS.forEach(d => { byDay[d] = []; });
  schedules.forEach((s, idx) => {
    const d = s.time_slot_detail?.day;
    if (d) byDay[d].push({ ...s, _colorIdx: idx % COLOR_MAP.length });
  });

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const isTeacher = user?.role === 'staff';

  return (
    <div className="page-bottom-safe bg-slate-50/50">
      <div className="mb-3 sm:mb-4 md:mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">My Schedule</h1>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1">{isTeacher ? 'Teaching Schedule' : 'Student Class Schedule'}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span className="hidden sm:inline">Print</span>
        </button>
      </div>

      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 space-y-3 sm:space-y-4 md:space-y-6 pb-6">
      {/* Today's Classes */}
      <div className="bg-gradient-to-br from-[#1A0B2E] to-[#2D1452] rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <p className="text-[9px] sm:text-[10px] font-black text-violet-300 uppercase tracking-widest">Today</p>
            <h3 className="text-base sm:text-lg font-black">{new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</h3>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" /></svg>
          </div>
        </div>
        {todaySchedule.length === 0 ? (
          <p className="text-violet-300 text-sm font-medium sm:text-base">No classes scheduled for today.</p>
        ) : (
          <div className="space-y-2">
            {todaySchedule.map(s => (
                <div key={s.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/10 border border-white/10">
                  <div className="text-center min-w-[52px] sm:min-w-[60px] flex-shrink-0">
                    <p className="text-xs sm:text-sm font-black text-violet-200">{s.time_slot_detail?.start_time_display}</p>
                    <p className="text-[9px] sm:text-xs text-violet-400">{s.time_slot_detail?.end_time_display}</p>
                  </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{s.subject_name}</p>
                  <p className="text-[10px] text-violet-300 truncate">
                    {isTeacher ? s.classroom_name : s.teacher_name}
                    {s.room_name ? ` · 📍 ${s.room_name}` : ''}
                  </p>
                </div>
                <span className="text-[9px] font-black text-violet-300 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-lg">{s.subject_code}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly View */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Day Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-100 scrollbar-none pb-1">
          {DAYS.map(d => {
            const count = byDay[d].length;
            const isToday = d === todayName;
            return (
              <button key={d} onClick={() => setActiveDay(d)}
                className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest border-b-2 transition-all relative ${
                  activeDay === d ? 'border-violet-600 text-violet-600 bg-violet-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                {DAY_SHORT[d]}
                {isToday && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                {count > 0 && <span className="ml-1 text-[8px] sm:text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-black">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Day Content */}
        <div className="p-3 sm:p-4">
           <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">{DAY_FULL[activeDay]}</p>
          {byDay[activeDay].length === 0 ? (
            <div className="py-8 sm:py-10 text-center">
              <p className="text-sm font-bold text-slate-400">No classes on {DAY_FULL[activeDay]}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {byDay[activeDay].sort((a,b) => (a.time_slot_detail?.start_time||'').localeCompare(b.time_slot_detail?.start_time||'')).map(s => (
                <div key={s.id} className={`flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border ${COLOR_MAP[s._colorIdx]}`}>
                  <div className="text-center min-w-[56px] sm:min-w-[64px] flex-shrink-0">
                    <p className="text-sm font-black">{s.time_slot_detail?.start_time_display}</p>
                    <p className="text-[10px] sm:text-xs opacity-70">{s.time_slot_detail?.end_time_display}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{s.subject_name}</p>
                    <p className="text-[11px] opacity-80 truncate mt-0.5">
                      {isTeacher ? `Section: ${s.classroom_name}` : `Teacher: ${s.teacher_name}`}
                    </p>
                    {s.room_name && <p className="text-[10px] opacity-60 mt-0.5">📍 {s.room_name}{s.room_building ? `, ${s.room_building}` : ''}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black opacity-70 uppercase tracking-widest">{s.subject_code}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-black text-violet-600">{schedules.length}</p>
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Classes</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-black text-emerald-600">{todaySchedule.length}</p>
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Today</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-black text-violet-600">{DAYS.filter(d => byDay[d].length > 0).length}</p>
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">School Days</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-black text-amber-600">{new Set(schedules.map(s => s.subject_name)).size}</p>
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Subjects</p>
        </div>
      </div>

      </div>
    </div>
  );
}

