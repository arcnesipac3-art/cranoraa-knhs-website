import { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../styles/designSystem';
import api from '../../utils/api';
import { Skeleton } from '../ui';

function toMinutes(timeStr) {
  if (!timeStr) return 0;
  const m24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  const m12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m12) return 0;
  let h = parseInt(m12[1], 10);
  const min = parseInt(m12[2], 10);
  const p = m12[3].toUpperCase();
  if (p === 'PM' && h !== 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function fmtCountdown(minutesLeft) {
  if (minutesLeft <= 0) return 'Now';
  if (minutesLeft < 60) return `${minutesLeft}m`;
  const h = Math.floor(minutesLeft / 60);
  const m = minutesLeft % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const TodaySchedulePanel = memo(() => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nowMinutes, setNowMinutes] = useState(
    new Date().getHours() * 60 + new Date().getMinutes()
  );

  useEffect(() => {
    api.get('/schedules/today/')
      .then(r => setSchedule(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // tick every minute
  useEffect(() => {
    const id = setInterval(() => {
      setNowMinutes(new Date().getHours() * 60 + new Date().getMinutes());
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const currentIdx = schedule.findIndex(s => {
    const start = toMinutes(s.time_slot_detail?.start_time_display);
    const end = toMinutes(s.time_slot_detail?.end_time_display);
    return nowMinutes >= start && nowMinutes < end;
  });

  const nextClassIdx = schedule.findIndex((s, idx) => {
    if (idx <= currentIdx) return false;
    return toMinutes(s.time_slot_detail?.start_time_display) > nowMinutes;
  });

  const nextClass = nextClassIdx >= 0 ? schedule[nextClassIdx] : null;
  const minutesToNext = nextClass
    ? toMinutes(nextClass.time_slot_detail?.start_time_display) - nowMinutes
    : null;

  const remainingCount = schedule.filter((s, idx) =>
    idx > currentIdx && toMinutes(s.time_slot_detail?.start_time_display) > nowMinutes
  ).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Today&apos;s Schedule</h3>
            <p className="text-[10px] text-slate-500 font-medium">
              {schedule.length > 0 ? `${schedule.length} class${schedule.length !== 1 ? 'es' : ''} today` : 'No classes today'}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/my-schedule')}
          className="text-[11px] font-bold text-violet-600 hover:text-violet-700 uppercase tracking-wide transition-colors">
          Full Schedule
        </button>
      </div>

      <div className="px-4 py-3 flex-1 min-h-0 flex flex-col gap-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton.ScheduleRow key={i} />)}
          </div>
        ) : schedule.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-500">No classes today</p>
            <p className="text-xs text-slate-400 mt-1">Enjoy your free day!</p>
            <button onClick={() => navigate('/my-schedule')}
              className="mt-3 text-xs font-bold text-violet-600 hover:text-violet-700 underline transition-colors">
              View weekly schedule
            </button>
          </div>
        ) : (
          <>
            {/* Currently teaching */}
            {currentIdx !== -1 && (
              <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 p-3.5 shadow-md shadow-violet-200/40">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-violet-200 uppercase tracking-widest">Now Teaching</span>
                </div>
                <p className="text-sm font-extrabold text-white leading-tight">
                  {schedule[currentIdx]?.subject_name || schedule[currentIdx]?.subject_detail?.name || 'Subject'}
                </p>
                <p className="text-xs text-violet-200 mt-0.5">
                  {schedule[currentIdx]?.classroom_name || schedule[currentIdx]?.classroom_detail?.name || 'Classroom'}
                </p>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-[10px] font-bold text-violet-200">
                    {schedule[currentIdx]?.time_slot_detail?.start_time_display} – {schedule[currentIdx]?.time_slot_detail?.end_time_display}
                  </span>
                  <button
                    onClick={() => navigate('/my-classes')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] font-bold text-white transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Class
                  </button>
                </div>
              </div>
            )}

            {/* Next class countdown */}
            {nextClass && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-extrabold text-amber-700">{fmtCountdown(minutesToNext)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Up Next</p>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {nextClass.subject_name || nextClass.subject_detail?.name}
                  </p>
                  <p className="text-[10px] text-amber-600 font-medium">
                    {nextClass.time_slot_detail?.start_time_display} · {nextClass.classroom_name || nextClass.classroom_detail?.name}
                  </p>
                </div>
              </div>
            )}

            {/* Remaining label */}
            {remainingCount > 0 && (
              <p className="text-[10px] text-slate-400 font-semibold px-0.5">
                {remainingCount} more class{remainingCount > 1 ? 'es' : ''} remaining today
              </p>
            )}

            {/* Full list */}
            <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-0.5">
              {schedule.map((s, idx) => {
                const isCurrent = idx === currentIdx;
                const isPast = currentIdx !== -1 ? idx < currentIdx : toMinutes(s.time_slot_detail?.end_time_display) < nowMinutes;
                const isNext = idx === nextClassIdx;
                return (
                  <div key={s.id} className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all',
                    isCurrent && 'bg-violet-600 border-violet-700 text-white shadow-sm',
                    isNext && !isCurrent && 'bg-amber-50 border-amber-200',
                    !isCurrent && !isNext && !isPast && 'bg-white border-slate-100 hover:border-violet-200',
                    isPast && 'bg-slate-50 border-slate-100 opacity-50',
                  )}>
                    <div className="text-center min-w-[46px] shrink-0">
                      <p className={cn('text-[11px] font-extrabold leading-tight', isCurrent ? 'text-white' : 'text-slate-900')}>
                        {s.time_slot_detail?.start_time_display}
                      </p>
                      <p className={cn('text-[9px] font-semibold', isCurrent ? 'text-violet-200' : 'text-slate-400')}>
                        {s.time_slot_detail?.end_time_display}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-extrabold truncate', isCurrent ? 'text-white' : 'text-slate-900')}>
                        {s.subject_name || s.subject_detail?.name || 'Subject'}
                      </p>
                      <p className={cn('text-[10px] font-medium truncate', isCurrent ? 'text-violet-100' : 'text-slate-500')}>
                        {s.classroom_name || s.classroom_detail?.name}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-emerald-500 text-white px-1.5 py-0.5 rounded shrink-0">Now</span>
                    )}
                    {isPast && (
                      <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

TodaySchedulePanel.displayName = 'TodaySchedulePanel';
export default TodaySchedulePanel;
