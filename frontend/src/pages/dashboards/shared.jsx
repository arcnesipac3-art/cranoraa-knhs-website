import { memo, useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, Skeleton } from '../../components/ui';
import { cn } from '../../styles/designSystem';
import api from '../../utils/api';
import { useActiveAcademicYear } from '../../hooks/useActiveAcademicYear';

/**
 * Shared Dashboard Components - DepEd Academic Style
 * Used across Teacher, Student, and Admin dashboards
 */

// Official KNHS School Header Banner
export const SchoolHeaderBanner = ({ user, today }) => {
  const { academicYear } = useActiveAcademicYear();

  return (
    <Card className="relative overflow-hidden border-b-4 border-violet-600 shadow-md">
      <CardBody className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* School Identity */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-md bg-white p-2 flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
              <img src="/icons/school-logo-source.png" alt="KNHS Logo" className="w-full h-full object-contain" loading="lazy" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Kiwalan National High School
              </h1>
              <p className="text-xs md:text-sm font-bold text-violet-700 tracking-wide mt-0.5">
                Official Digital Campus Portal
              </p>
              {academicYear && (
                <p className="text-[10px] md:text-xs font-semibold text-slate-600 tracking-wide mt-1">
                  School Year {academicYear}
                </p>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-md bg-violet-50 border border-violet-200">
            <div className="w-12 h-12 rounded-md bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-sm overflow-hidden border border-violet-700 shrink-0">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="text-sm">{user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}</span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[10px] font-bold text-violet-700 tracking-wide">
                {user?.role}
              </p>
              <p className="text-[10px] font-semibold text-slate-600 mt-0.5">
                {today}
              </p>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

// Academic Stat Card
export const StatCard = memo(({ label, value, sub, icon, color = 'blue', onClick, badge }) => {
  const iconThemes = {
    blue:    'bg-violet-600 text-white border-violet-700',
    emerald: 'bg-emerald-600 text-white border-emerald-700',
    rose:    'bg-rose-600 text-white border-rose-700',
    amber:   'bg-amber-500 text-white border-amber-600',
    sky:     'bg-sky-600 text-white border-sky-700',
    slate:   'bg-slate-500 text-white border-slate-600',
  };

  return (
    <Card
      interactive={!!onClick}
      onClick={onClick}
      className={cn(
        "border-l-4 transition-all hover:shadow-md",
        color === 'blue' && "border-l-violet-500",
        color === 'emerald' && "border-l-emerald-500",
        color === 'rose' && "border-l-rose-500",
        color === 'amber' && "border-l-amber-500",
        color === 'sky' && "border-l-sky-500",
        color === 'slate' && "border-l-slate-400",
        onClick && "cursor-pointer"
      )}
    >
      <CardBody className="p-2 flex flex-col justify-between min-h-[70px] md:min-h-[85px]">
        <div className="flex items-start justify-between">
          <div className={cn(
            "w-6 h-6 md:w-7 md:h-7 rounded flex items-center justify-center border shadow-sm",
            iconThemes[color]
          )}>
            {icon}
          </div>
          {badge > 0 && (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-700 border border-red-200">
              {badge}
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <p className="text-[9px] md:text-[10px] font-semibold text-slate-600 mb-0.5 tracking-wide truncate">
            {label}
          </p>
          <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-none truncate">
            {value ?? '—'}
          </h3>
          {sub && (
            <p className="text-[9px] md:text-[10px] font-semibold text-slate-500 mt-0.5 truncate">{sub}</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

// Today's Schedule Widget for Teachers
export const TodayScheduleWidget = memo(({ navigate }) => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/schedules/today/')
      .then(r => setSchedule(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
  const currentIdx = schedule.findIndex(s => {
    const start = toMinutes(s.time_slot_detail?.start_time_display);
    const end = toMinutes(s.time_slot_detail?.end_time_display);
    return nowMinutes >= start && nowMinutes < end;
  });

  return (
    <Card>
      <CardHeader divider>
        <div className="flex items-center justify-between">
          <CardTitle subtitle="Your teaching schedule">Today's Classes</CardTitle>
          <button
            onClick={() => navigate('/my-schedule')}
            className="text-xs font-bold text-violet-600 hover:text-violet-700 tracking-wide"
          >
            Full Schedule
          </button>
        </div>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="space-y-2" aria-label="Loading schedule…" aria-busy="true">
            {[1, 2, 3].map(i => <Skeleton.ScheduleRow key={i} />)}
          </div>
        ) : schedule.length === 0 ? (
          <EmptyState
            title="No classes today"
            description="Check your full schedule for the week"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {schedule.map((s, idx) => {
              const isCurrent = idx === currentIdx;
              const isPast = currentIdx !== -1 && idx < currentIdx;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-md border transition-all",
                    isCurrent && "bg-violet-600 border-violet-700 text-white shadow-md",
                    !isCurrent && !isPast && "bg-white border-slate-200 hover:border-violet-300",
                    isPast && "bg-slate-50 border-slate-100 opacity-60"
                  )}
                >
                  <div className="text-center min-w-[56px] shrink-0">
                    <p className={cn(
                      "text-xs font-bold leading-tight",
                      isCurrent ? "text-white" : "text-slate-900"
                    )}>
                      {s.time_slot_detail?.start_time_display}
                    </p>
                    <p className={cn(
                      "text-[10px] font-semibold",
                      isCurrent ? "text-violet-200" : "text-slate-500"
                    )}>
                      {s.time_slot_detail?.end_time_display}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-bold truncate",
                      isCurrent ? "text-white" : "text-slate-900"
                    )}>
                      {s.subject_detail?.name || 'Subject'}
                    </p>
                    <p className={cn(
                      "text-xs font-semibold truncate",
                      isCurrent ? "text-violet-100" : "text-slate-600"
                    )}>
                      {s.classroom_detail?.name || 'Classroom'}
                    </p>
                  </div>
                  {isCurrent && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold tracking-wide">Now</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
});

TodayScheduleWidget.displayName = 'TodayScheduleWidget';

// Recent Announcements Widget
export const RecentAnnouncementsWidget = memo(({ navigate }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/announcements/?limit=5')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.results || [];
        setAnnouncements(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffHours = Math.floor((Date.now() - date) / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card>
      <CardHeader divider>
        <div className="flex items-center justify-between">
          <CardTitle subtitle="School updates">Recent Announcements</CardTitle>
          <button
            onClick={() => navigate('/announcements')}
            className="text-xs font-bold text-violet-600 hover:text-violet-700 tracking-wide"
          >
            View All
          </button>
        </div>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="space-y-2" aria-label="Loading announcements…" aria-busy="true">
            {[1, 2, 3].map(i => <Skeleton.AnnouncementRow key={i} />)}
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState
            title="No announcements"
            description="School announcements will appear here"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {announcements.map(a => (
              <button
                key={a.id}
                onClick={() => navigate('/announcements')}
                className="w-full text-left p-3 rounded-md border border-slate-200 bg-white hover:border-violet-400 hover:shadow-md transition-all group"
              >
                <p className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-violet-700 transition-colors">
                  {a.title}
                </p>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                  {a.content}
                </p>
                <p className="text-[10px] font-semibold text-violet-600 tracking-wide mt-2">
                  {formatTime(a.created_at)}
                </p>
              </button>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
});

RecentAnnouncementsWidget.displayName = 'RecentAnnouncementsWidget';
