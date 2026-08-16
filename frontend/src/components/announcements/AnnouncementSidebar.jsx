import { useState, useEffect } from 'react';
import api from '../../utils/api';

const QUICK_LINKS = [
  { label: 'Academic Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', href: '/portal-calendar' },
  { label: 'Student Portal', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253', href: '/dashboard' },
  { label: 'Contact Admin', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', href: '/communication-center' },
  { label: 'School Website', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9', href: '/' },
];

const CATEGORY_COLORS = {
  general: 'bg-slate-100 text-slate-600',
  academic: 'bg-blue-50 text-blue-700',
  events: 'bg-amber-50 text-amber-700',
  examinations: 'bg-purple-50 text-purple-700',
  emergency: 'bg-red-50 text-red-700',
  guidance: 'bg-teal-50 text-teal-700',
  sports: 'bg-orange-50 text-orange-700',
  holiday: 'bg-emerald-50 text-emerald-700',
};

const formatShortDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatEventTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const AnnouncementSidebar = ({ announcements = [] }) => {
  const pinned = announcements.filter(a => a.is_pinned).slice(0, 5);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    setLoadingEvents(true);
    api.get(`/student/calendar/?year=${year}&month=${month}`)
      .then(r => {
        const nowTime = new Date();
        const upcoming = (r.data || [])
          .filter(e => new Date(e.date || e.start_date) >= nowTime)
          .sort((a, b) => new Date(a.date || a.start_date) - new Date(b.date || b.start_date))
          .slice(0, 5);
        setCalendarEvents(upcoming);
      })
      .catch(() => setCalendarEvents([]))
      .finally(() => setLoadingEvents(false));
  }, []);

  return (
    <div className="sticky top-24 space-y-4">
      {/* Upcoming Events — from Calendar API (announcements with event_date) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Upcoming Events</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Month</span>
        </div>
        <div className="divide-y divide-slate-50">
          {loadingEvents ? (
            <div className="px-4 py-6 text-center">
              <div className="w-5 h-5 border-2 border-violet-300 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Loading events...</p>
            </div>
          ) : calendarEvents.length > 0 ? (
            calendarEvents.map((event, idx) => {
              const eventDate = new Date(event.date || event.start_date);
              const catColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.general;
              return (
                <a
                  key={event.id || idx}
                  href={`/announcements`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-50 flex flex-col items-center justify-center shrink-0 border border-violet-100 group-hover:bg-violet-100 transition-colors">
                    <span className="text-[9px] font-bold text-violet-600 uppercase leading-none">
                      {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-sm font-black text-violet-700 leading-none mt-0.5">
                      {eventDate.getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-violet-700 transition-colors">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${catColor}`}>
                        {event.category || 'Event'}
                      </span>
                      {event.end_date && (
                        <span className="text-[10px] text-slate-400">
                          – {formatShortDate(event.end_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })
          ) : (
            <div className="px-4 py-6 text-center">
              <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs text-slate-400 font-medium">No upcoming events this month</p>
            </div>
          )}
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
          <a href="/portal-calendar" className="text-[11px] font-bold text-violet-600 hover:text-violet-800 uppercase tracking-wider transition-colors">
            View Full Calendar →
          </a>
        </div>
      </div>

      {/* Recently Pinned */}
      {pinned.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Pinned</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {pinned.map(a => (
              <div key={a.id} className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
                <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">{a.title}</p>
                <p className="text-[11px] text-slate-400 mt-1">{formatShortDate(a.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Quick Links</h3>
        </div>
        <div className="p-2">
          {QUICK_LINKS.map((link, idx) => (
            <a
              key={idx}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
              </svg>
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{link.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* School Info */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-violet-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-sm font-bold">Kiwalan National High School</h3>
        </div>
        <p className="text-xs text-violet-200 leading-relaxed">
          Empowering minds, building futures. Official announcements and updates for the KNHS community.
        </p>
      </div>
    </div>
  );
};

export default AnnouncementSidebar;
