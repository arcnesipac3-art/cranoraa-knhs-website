import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Skeleton } from '../components/ui';
import { SectionHeading } from '../components/public';

// ── helpers ───────────────────────────────────────────────────────────────────
const attachUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const base = (() => {
    try {
      const u = new URL(api.defaults.baseURL);
      u.pathname = u.pathname.replace(/\/api\/?$/, '') || '/';
      return u.toString().replace(/\/$/, '');
    } catch { return api.defaults.baseURL.replace(/\/api\/?$/, ''); }
  })();
  return `${base}${url}`;
};
const getFirstImage = (a) => {
  if (a.attachment_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(a.attachment_url)) return attachUrl(a.attachment_url);
  const img = a.attachments?.find(att => att.is_image);
  return attachUrl(img?.url);
};
const getPDFs = (a) => {
  const pdfs = [];
  if (a.attachment_url?.toLowerCase().endsWith('.pdf')) pdfs.push({ name: 'Attachment.pdf', url: attachUrl(a.attachment_url) });
  a.attachments?.forEach(att => { if (att.url?.toLowerCase().endsWith('.pdf')) pdfs.push({ name: att.filename || 'Document.pdf', url: attachUrl(att.url) }); });
  return pdfs;
};
const formatDate = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

const CAT_STYLES = {
  academic: 'border-violet-200 bg-violet-50 text-violet-800',
  events:   'border-emerald-200 bg-emerald-50 text-emerald-700',
  emergency:'border-red-200 bg-red-50 text-red-700',
  holiday:  'border-amber-200 bg-amber-50 text-amber-700',
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Mini Calendar ─────────────────────────────────────────────────────────────
const MiniCalendar = ({ events, onSelectDay }) => {
  const [currentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(i);
    return days;
  }, [currentDate]);
  const eventDays = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const start = new Date(e.event_date || e.created_at);
      const end = e.end_date ? new Date(e.end_date) : start;
      let curr = new Date(start); curr.setHours(0,0,0,0);
      const last = new Date(end); last.setHours(0,0,0,0);
      while (curr <= last) {
        if (curr.getMonth() === currentDate.getMonth() && curr.getFullYear() === currentDate.getFullYear())
          map[curr.getDate()] = (map[curr.getDate()] || 0) + 1;
        curr.setDate(curr.getDate() + 1);
      }
    });
    return map;
  }, [events, currentDate]);
  const monthName = currentDate.toLocaleDateString('en-PH', { month: 'long' });
  const handleDayClick = (day) => { if (!day) return; setSelectedDay(day); if (onSelectDay) onSelectDay(day); };
  return (
    <div className="public-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{monthName} {currentDate.getFullYear()}</p>
        <Link to="/calendar" className="text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors">
          Full calendar
        </Link>
      </div>
      <div className="p-4">
        <div className="mb-1 grid grid-cols-7 gap-1">
          {['S','M','T','W','T','F','S'].map((d,i) => (
            <div key={i} className="py-1 text-center text-[10px] font-semibold tracking-wider text-slate-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysInMonth.map((day, i) => {
            const hasEvent = day && eventDays[day];
            const isToday = day === currentDate.getDate();
            const isSelected = day === selectedDay;
            return (
              <button
                type="button"
                key={i}
                onClick={() => handleDayClick(day)}
                disabled={!day}
                aria-label={day ? `${monthName} ${day}` : undefined}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-md text-xs font-medium transition-colors
                  ${!day ? 'invisible' : ''}
                  ${isSelected ? 'bg-violet-800 text-white' : hasEvent ? 'bg-violet-50 text-violet-900 hover:bg-violet-100' : 'text-slate-600 hover:bg-slate-100'}
                  ${isToday && !isSelected ? 'ring-1 ring-violet-500' : ''}`}
              >
                {day}
                {hasEvent && !isSelected && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-violet-500" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Section panel with a formal heading strip ─────────────────────────────────
const Panel = ({ title, action, children }) => (
  <section className="public-card overflow-hidden">
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <h2 className="text-sm font-semibold tracking-[0.08em] text-violet-900">{title}</h2>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

// ── Main component ────────────────────────────────────────────────────────────
const HomeDepEd = () => {
  const [content, setContent] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [selectedDayLabel, setSelectedDayLabel] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/website-content/public/').then(r => {
        const map = {};
        const data = Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
        data.forEach(item => { map[item.section] = item; });
        setContent(map);
      }).catch(() => {}),
      api.get('/announcements/public/').then(r => setAnnouncements(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const slides = [
    {
      kicker: 'Official School Website',
      title: 'Welcome to Kiwalan National High School',
      lead: 'Providing accessible, quality basic education for the youth of Kiwalan and its neighbouring communities.',
      cta: { label: 'About the school', to: '/about' },
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600',
    },
    {
      kicker: 'Admissions · School Year 2026–2027',
      title: 'Enrollment is now open',
      lead: 'Submit your application online and follow its progress through our enrollment tracking system.',
      cta: { label: 'Apply for enrollment', to: '/enroll' },
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600',
    },
    {
      kicker: 'Academic Programs',
      title: 'K to 12 and Senior High School pathways',
      lead: 'Explore our academic, technical-vocational, and humanities and social sciences strands.',
      cta: { label: 'View programs', to: '/k12-programs' },
      image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1600',
    },
  ];

  // Auto-advance, unless the user prefers reduced motion or has paused the carousel
  useEffect(() => {
    if (paused || prefersReducedMotion()) return undefined;
    const timer = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 7000);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  const handleSelectDay = (day) => {
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth(), day);
    target.setHours(0,0,0,0);
    const dayEvents = announcements.filter(a => {
      const start = new Date(a.event_date || a.created_at); start.setHours(0,0,0,0);
      const end = a.end_date ? new Date(a.end_date) : start; end.setHours(0,0,0,0);
      return target >= start && target <= end;
    });
    setSelectedDateEvents(dayEvents);
    setSelectedDayLabel(day);
  };

  const generalAnnouncements = announcements.filter(a => a.category !== 'events').slice(0, 3);
  const upcomingEvents = announcements
    .filter(a => a.category === 'events' && (a.event_date || a.created_at))
    .sort((a, b) => new Date(a.event_date || a.created_at) - new Date(b.event_date || b.created_at))
    .filter(a => { const end = a.end_date ? new Date(a.end_date) : new Date(a.event_date || a.created_at); const today = new Date(); today.setHours(0,0,0,0); return end >= today; })
    .slice(0, 4);

  if (loading) return (
    <div className="bg-white px-4 py-6 space-y-5">
      <Skeleton.Banner className="h-48 md:h-72" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton.AnnouncementRow key={i} />)}
      </div>
      <Skeleton.CardGrid count={4} cols={4} />
    </div>
  );

  return (
    <div className="bg-white">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HERO                                                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section
        aria-label="Featured announcements"
        aria-roledescription="carousel"
        className="relative h-[54vh] min-h-[420px] overflow-hidden bg-slate-900 md:h-[60vh]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            aria-hidden={index !== currentSlide}
            className={`absolute inset-0 transition-opacity duration-700 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <img src={slide.image} alt="" className="h-full w-full object-cover" loading={index === 0 ? 'eager' : 'lazy'} />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-slate-900/25" />
          </div>
        ))}

        <div className="relative flex h-full items-center">
          <div className="public-shell w-full">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-violet-300">
                {slides[currentSlide].kicker}
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-[2.75rem]">
                {slides[currentSlide].title}
              </h2>
              <div className="mt-4 h-0.5 w-16 bg-violet-500" aria-hidden="true" />
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200 md:text-base">
                {slides[currentSlide].lead}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={slides[currentSlide].cta.to} className="public-btn-onDark">
                  {slides[currentSlide].cta.label}
                </Link>
                <Link to="/enroll" className="public-btn-secondary !border-white/40 !bg-transparent !text-white hover:!bg-white/10">
                  Enroll now
                </Link>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCurrentSlide((currentSlide - 1 + slides.length) % slides.length)}
          aria-label="Previous slide"
          className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/30 bg-slate-950/40 p-2.5 text-white transition-colors hover:bg-slate-950/70 md:block"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setCurrentSlide((currentSlide + 1) % slides.length)}
          aria-label="Next slide"
          className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/30 bg-slate-950/40 p-2.5 text-white transition-colors hover:bg-slate-950/70 md:block"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === currentSlide}
              className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-white' : 'w-4 bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* QUICK LINKS                                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-label="Quick links" className="border-b border-slate-200 bg-slate-50">
        <div className="public-shell">
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 md:grid-cols-4 md:divide-y-0">
            {[
              { title: 'Learner Information System', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', link: '/login' },
              { title: "Teacher's Portal", icon: 'M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5z', link: '/login' },
              { title: 'School Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', link: '/calendar' },
              { title: 'Track Enrollment', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', link: '/track-enrollment' },
            ].map((item, i) => (
              <Link
                key={i}
                to={item.link}
                className="group flex items-center gap-3 px-4 py-5 transition-colors hover:bg-white"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-700 transition-colors group-hover:border-violet-400 group-hover:bg-violet-50">
                  <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={item.icon} />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight text-slate-800 transition-colors group-hover:text-violet-900">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">Open</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* AT A GLANCE                                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-label="School at a glance" className="bg-white py-10">
        <div className="public-shell">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-4">
            {[
              { val: '1,200+', label: 'Enrolled students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { val: '5,000+', label: 'Graduates to date', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { val: '80+',    label: 'Faculty members', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              { val: '150+',   label: 'Awards & honors', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 bg-white px-4 py-6 text-center">
                <svg className="mb-1 h-5 w-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={s.icon} />
                </svg>
                <p className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{s.val}</p>
                <p className="text-[11px] font-medium tracking-[0.1em] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* NEWS / EVENTS / CALENDAR                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="public-section public-section-alt">
        <div className="public-shell">
          <SectionHeading
            kicker="Latest from the school"
            title="News, announcements and events"
            lead="Official releases, advisories and activities published by the school administration."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* LEFT: NEWS UPDATES */}
            <Panel
              title="News updates"
              action={
                <Link to="/news-events" className="text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors">
                  View all
                </Link>
              }
            >
              <div className="space-y-4">
                {generalAnnouncements.length > 0 ? generalAnnouncements.map(a => {
                  const imageUrl = getFirstImage(a);
                  const pdfs = getPDFs(a);
                  const catStyle = CAT_STYLES[a.category] || 'border-slate-200 bg-slate-50 text-slate-600';
                  return (
                    <article key={a.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex gap-3">
                        {imageUrl && (
                          <button
                            type="button"
                            onClick={() => setZoomedImage(imageUrl)}
                            className="h-16 w-16 shrink-0 overflow-hidden rounded border border-slate-200"
                            aria-label={`View image for ${a.title}`}
                          >
                            <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ${catStyle}`}>
                              {a.category}
                            </span>
                            <time dateTime={a.created_at} className="text-[11px] text-slate-400">
                              {formatDate(a.created_at)}
                            </time>
                          </div>
                          <h3 className="text-sm font-semibold leading-snug text-slate-900">
                            <Link to="/news-events" className="hover:text-violet-800 transition-colors">
                              {a.title}
                            </Link>
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{a.content}</p>
                          {pdfs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {pdfs.map((pdf, j) => (
                                <a
                                  key={j}
                                  href={pdf.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors hover:border-red-200 hover:text-red-600"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  PDF
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }) : (
                  <p className="py-6 text-center text-sm text-slate-500">No announcements at this time.</p>
                )}
              </div>
            </Panel>

            {/* MIDDLE: EVENTS + PROGRAMS */}
            <div className="space-y-6">
              <Panel
                title="Upcoming events"
                action={
                  <Link to="/calendar" className="text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors">
                    Calendar
                  </Link>
                }
              >
                <div className="space-y-3.5">
                  {upcomingEvents.length > 0 ? upcomingEvents.map(ev => {
                    const d = new Date(ev.event_date || ev.created_at);
                    return (
                      <Link
                        key={ev.id}
                        to={`/calendar?year=${d.getFullYear()}&month=${d.getMonth()+1}`}
                        className="group flex items-start gap-3"
                      >
                        <div className="w-11 shrink-0 overflow-hidden rounded border border-slate-200 text-center">
                          <div className="bg-violet-800 py-0.5 text-[9px] font-semibold tracking-wider text-violet-100">
                            {d.toLocaleDateString('en-PH',{month:'short'})}
                          </div>
                          <div className="py-1 text-sm font-bold text-slate-900">{d.getDate()}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-violet-800">
                            {ev.title}
                          </h3>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{ev.content}</p>
                        </div>
                      </Link>
                    );
                  }) : (
                    <p className="py-4 text-center text-sm text-slate-500">No upcoming events.</p>
                  )}
                </div>
              </Panel>

              <Panel title="Featured programs">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { code: 'Academic', track: 'Core academic strand', img: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&q=60' },
                    { code: 'TechPro', track: 'Technical-vocational strand', img: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&q=60' },
                  ].map((prog, i) => (
                    <Link
                      key={i}
                      to="/senior-high"
                      className="group overflow-hidden rounded border border-slate-200 transition-colors hover:border-violet-300"
                    >
                      <div className="h-20 overflow-hidden bg-slate-100">
                        <img src={prog.img} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="text-[13px] font-semibold text-slate-900">{prog.code}</p>
                        <p className="text-[11px] text-slate-500">{prog.track}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Panel>
            </div>

            {/* RIGHT: CALENDAR + ANNOUNCEMENTS FEED */}
            <div className="space-y-6">
              <MiniCalendar
                events={announcements.filter(a => a.category === 'events')}
                onSelectDay={handleSelectDay}
              />

              <Panel title={selectedDayLabel ? `Events on ${new Date().toLocaleDateString('en-PH',{month:'short'})} ${selectedDayLabel}` : 'Announcements'}>
                <div className="space-y-3.5">
                  {(selectedDayLabel ? selectedDateEvents : announcements.slice(0, 5)).map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-[11px] font-bold text-violet-800">
                        K
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800">Kiwalan NHS</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600">{a.title}</p>
                        <time
                          dateTime={a.created_at}
                          className="mt-1 block text-[10px] text-slate-400"
                        >
                          {new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </time>
                      </div>
                    </div>
                  ))}
                  {!selectedDayLabel && announcements.length === 0 && (
                    <p className="py-4 text-center text-sm text-slate-500">No announcements.</p>
                  )}
                  {selectedDayLabel && selectedDateEvents.length === 0 && (
                    <p className="py-4 text-center text-sm text-slate-500">No events on this day.</p>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ABOUT THE SCHOOL                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="public-section">
        <div className="public-shell">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                kicker="About the school"
                title="Kiwalan National High School"
                lead="A holistic learning environment that pairs academic rigour with character building and practical skills for every learner."
              />
              <div className="public-prose mt-6 space-y-4 text-slate-600">
                <p>
                  We deliver the K to 12 basic education program with a full suite of core subjects,
                  applied track subjects, and work immersion opportunities preparing students for
                  higher education, employment, or entrepreneurship.
                </p>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/about" className="public-btn-primary">Learn more about us</Link>
                <Link to="/mission" className="public-btn-secondary">Our mission and vision</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { title: content.home_feature_1_title?.content || 'Quality education', desc: content.home_feature_1_content?.content || 'A comprehensive K-12 curriculum designed to prepare students for success in higher education.', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                { title: content.home_feature_2_title?.content || 'Dedicated faculty', desc: content.home_feature_2_content?.content || 'Experienced and licensed teachers committed to student growth and academic excellence.', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                { title: content.home_feature_3_title?.content || 'Learning facilities', desc: content.home_feature_3_content?.content || 'Classrooms, laboratories and learning spaces that support the full basic education program.', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                { title: 'Digital portal', desc: 'A dedicated portal for grades, attendance, learning materials and school announcements.', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              ].map((f, i) => (
                <div key={i} className="public-card p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={f.icon} />
                    </svg>
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PORTALS                                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="public-section public-section-alt">
        <div className="public-shell">
          <SectionHeading
            align="center"
            kicker="Digital campus"
            title="Portals for students, parents and teachers"
            lead="Each member of the school community has a dedicated workspace with the records and tools they need."
          />

          <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { role: 'Students', features: ['View grades and report cards', 'Track attendance records', 'Access learning materials', 'Receive announcements', 'Message teachers'] },
              { role: 'Teachers', features: ['Input and manage grades', 'Record daily attendance', 'Upload learning materials', 'Post announcements', 'Communicate with students'] },
              { role: 'Administrators', features: ['Manage users and classes', 'View analytics and reports', 'Control enrollment', 'System settings and audit logs', 'Backup and maintenance tools'] },
            ].map((r, i) => (
              <div key={i} className="public-card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">{r.role}</h3>
                </div>
                <ul className="space-y-2.5 p-5">
                  {r.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-[13px] leading-snug text-slate-600">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-9 text-center">
            <Link to="/portals" className="public-btn-secondary">View all portals</Link>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LOCATION                                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="public-section">
        <div className="public-shell">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                kicker="Visit us"
                title="Campus and contact information"
                lead="We welcome prospective students and parents to visit the campus. The registrar's office is open on school days for enrollment inquiries."
              />

              <dl className="mt-7 divide-y divide-slate-100 border-y border-slate-100">
                {[
                  { icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', label: 'Address', value: 'Kiwalan, Iligan City, Lanao del Norte, Philippines' },
                  { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Office hours', value: 'Monday to Friday, 7:00 AM – 5:00 PM' },
                  { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'Email', value: 'info@kiwalan-nhs.edu.ph' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-violet-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={item.icon} />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <dt className="public-dl-label">{item.label}</dt>
                      <dd className="public-dl-value mt-1">{item.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="https://maps.google.com/?q=Kiwalan+National+High+School+Iligan+City"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="public-btn-primary"
                >
                  Open in Google Maps
                </a>
                <Link to="/contact" className="public-btn-secondary">Contact the school</Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-card h-[380px]">
              <iframe
                title="Kiwalan National High School location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3948.2297046439908!2d124.27159847501021!3d8.27992249175451!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x325576cc580e692d%3A0x1ee65da2c86ad0a6!2sKiwalan%20National%20High%20School!5e0!3m2!1sen!2sph!4v1779569511724!5m2!1sen!2sph"
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ENROLLMENT CTA                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-slate-200 bg-slate-50 py-14 md:py-16">
        <div className="public-shell">
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-card md:p-12">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="public-kicker">School Year 2026–2027</p>
                <h2 className="public-title mt-2">Ready to enroll?</h2>
                <div className="public-rule" aria-hidden="true" />
                <p className="public-lead">
                  Applications are accepted online throughout the school year. Submit your requirements,
                  then follow your application status using our tracking page.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link to="/enroll" className="public-btn-primary">Apply for enrollment</Link>
                <Link to="/track-enrollment" className="public-btn-secondary">Track application</Link>
                <Link to="/contact" className="public-btn-secondary">Contact the registrar</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Image zoom modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full border border-white/30 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            onClick={() => setZoomedImage(null)}
            aria-label="Close image preview"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={zoomedImage}
            alt="Announcement attachment"
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
            loading="lazy"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default HomeDepEd;
