import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Skeleton } from '../components/ui';

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
const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const CAT_STYLES = {
  academic: 'bg-slate-50 text-violet-900 border-violet-200',
  events:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  emergency:'bg-red-50 text-red-700 border-red-200',
  holiday:  'bg-yellow-50 text-yellow-700 border-yellow-200',
};

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
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const handleDayClick = (day) => { if (!day) return; setSelectedDay(day); if (onSelectDay) onSelectDay(day); };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-900">{monthName} {currentDate.getFullYear()}</p>
        <Link to="/calendar" className="text-xs font-bold text-violet-800 hover:text-violet-950 transition-colors">View full →</Link>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="text-[10px] font-bold text-violet-600 text-center py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {daysInMonth.map((day, i) => {
          const hasEvent = day && eventDays[day];
          const isToday = day === currentDate.getDate();
          const isSelected = day === selectedDay;
          return (
            <div key={i} onClick={() => handleDayClick(day)}
              className={`aspect-square flex flex-col items-center justify-center text-[11px] font-semibold rounded-lg cursor-pointer transition-all relative
                ${!day ? 'invisible' : ''}
                ${isSelected ? 'bg-violet-900 text-white' : hasEvent ? 'bg-slate-50 text-violet-900 hover:bg-violet-100' : 'text-gray-600 hover:bg-violet-50'}
                ${isToday && !isSelected ? 'ring-2 ring-violet-400' : ''}`}>
              {day}
              {hasEvent && !isSelected && <span className="absolute bottom-0.5 w-1 h-1 bg-slate-500 rounded-full" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const HomeDepEd = () => {
  const [content, setContent] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
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

  // Auto-advance slider
  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const slides = [
    { title: 'MABUHAY!', subtitle: 'Welcome to Kiwalan NHS', tagline: 'NURTURING LEARNERS FOR THE FUTURE', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200' },
    { title: 'EXCELLENCE', subtitle: 'Quality Education for All', tagline: 'BUILDING TOMORROW\'S LEADERS TODAY', image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200' },
    { title: 'ENROLL NOW', subtitle: 'SY 2026-2027', tagline: 'BE PART OF OUR COMMUNITY', image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200' },
  ];

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
    <div className="min-h-screen bg-white px-4 py-6 space-y-5">
      <Skeleton.Banner className="h-48 md:h-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton.AnnouncementRow key={i} />)}
      </div>
      <Skeleton.CardGrid count={4} cols={4} />
    </div>
  );

  return (
    <div className="bg-white">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HERO SLIDER */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative h-[62vh] bg-gray-900 overflow-hidden">
        {slides.map((slide, index) => (
          <div key={index}
            className={`absolute inset-0 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${slide.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-violet-950/95 via-violet-900/80 to-transparent" />
          </div>
        ))}
        {/* Enrollment badge */}
        <div className="absolute top-6 right-6 z-10 hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-violet-700/30 border border-white/30 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-widest">Enrollment Open — SY 2026–2027</span>
        </div>
        {/* Slider Content */}
        <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center">
          <div className="max-w-xl bg-violet-950/80 backdrop-blur-sm p-8 rounded-xl border border-white/10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-2 text-center md:text-left">{slides[currentSlide].title}</h2>
            <p className="text-2xl md:text-3xl font-light text-violet-100 italic mb-2 text-center md:text-left">{slides[currentSlide].subtitle}</p>
            <p className="text-sm font-semibold text-violet-200 tracking-wide mb-6 text-center md:text-left">{slides[currentSlide].tagline}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
              <Link to="/enroll" className="w-full sm:w-auto px-6 py-3 bg-white text-violet-900 font-bold rounded-lg shadow-lg transition-colors hover:bg-violet-50 text-sm text-center">
                Enroll Now
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-6 py-3 bg-violet-900 hover:bg-violet-950 text-white font-semibold rounded-lg transition-colors text-sm text-center">
                Portal Login
              </Link>
            </div>
          </div>
        </div>
        {/* Nav Arrows */}
        <button onClick={() => setCurrentSlide((currentSlide - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-3 rounded-full backdrop-blur-sm transition-colors">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setCurrentSlide((currentSlide + 1) % slides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-3 rounded-full backdrop-blur-sm transition-colors">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)} className={`h-2 rounded-full transition-all ${i === currentSlide ? 'bg-white w-8' : 'bg-white/50 w-2'}`} />
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* QUICK LINKS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="bg-violet-950 py-0">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { title: "LEARNER INFORMATION SYSTEM", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", link: "/login" },
              { title: "TEACHER'S PORTAL", icon: "M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5z", link: "/login" },
              { title: "SCHOOL CALENDAR", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", link: "/calendar" },
              { title: "TRACK ENROLLMENT", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", link: "/track-enrollment" },
            ].map((item, i) => (
              <Link key={i} to={item.link} className="flex flex-col items-center gap-2 py-5 px-4 text-white border-r border-white/20 last:border-r-0 hover:bg-violet-900 transition-colors group">
                <svg className="w-8 h-8 text-violet-200 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <p className="text-[11px] font-semibold text-center leading-tight">{item.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STATS BAND */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 border-b border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
            {[
              { val: '1,200+', label: 'Enrolled Students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { val: '5,000+', label: 'Total Graduates',   icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { val: '80+',    label: 'Faculty Members',   icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              { val: '150+',   label: 'Awards & Honors',   icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-violet-900 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-violet-900">{s.val}</p>
                <p className="text-xs font-medium text-gray-600 tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 3-COLUMN NEWS / EVENTS / SOCIAL */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT: NEWS UPDATES */}
            <div>
              <div className="bg-violet-900 text-white px-4 py-2 font-semibold text-sm tracking-wide rounded-t-xl">NEWS UPDATES</div>
              <div className="bg-white border border-slate-200 p-4 space-y-4 rounded-b-xl">
                {generalAnnouncements.length > 0 ? generalAnnouncements.map(a => {
                  const imageUrl = getFirstImage(a);
                  const pdfs = getPDFs(a);
                  const catStyle = CAT_STYLES[a.category] || 'bg-slate-50 text-violet-900 border-violet-200';
                  return (
                    <div key={a.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex gap-3">
                        {imageUrl && (
                          <button onClick={() => setZoomedImage(imageUrl)} className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                            <img src={imageUrl} alt={a.title} className="w-full h-full object-cover" loading="lazy" />
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${catStyle}`}>{a.category}</span>
                            <span className="text-[10px] text-gray-400">{formatDate(a.created_at)}</span>
                          </div>
                          <h3 className="font-semibold text-sm text-slate-900 mb-1 line-clamp-2">{a.title}</h3>
                          <p className="text-xs text-gray-600 line-clamp-2">{a.content}</p>
                          {pdfs.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {pdfs.map((pdf, j) => (
                                <a key={j} href={pdf.url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold hover:bg-red-100">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  PDF
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-gray-500 py-6 text-center">No announcements at this time</p>
                )}
                <Link to="/news-events" className="block text-center text-xs font-semibold text-violet-800 hover:text-violet-950 pt-1">View All News →</Link>
              </div>
            </div>

            {/* MIDDLE: EVENTS + FEATURED PROGRAMS */}
            <div className="space-y-6">
              <div>
                <div className="bg-violet-900 text-white px-4 py-2 font-semibold text-sm tracking-wide rounded-t-xl">UPCOMING EVENTS</div>
                <div className="bg-white border border-slate-200 p-4 space-y-3 rounded-b-xl">
                  {upcomingEvents.length > 0 ? upcomingEvents.map(ev => {
                    const d = new Date(ev.event_date || ev.created_at);
                    return (
                      <Link key={ev.id} to={`/calendar?year=${d.getFullYear()}&month=${d.getMonth()+1}`}
                        className="flex items-start gap-3 group">
                        <div className="bg-violet-900 text-white text-center p-2 rounded-lg flex-shrink-0 w-12">
                          <p className="text-sm font-bold leading-none">{d.getDate()}</p>
                          <p className="text-[9px] uppercase mt-0.5">{d.toLocaleDateString('en-US',{month:'short'})}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-slate-900 group-hover:text-violet-900 transition-colors line-clamp-1">{ev.title}</h4>
                          <p className="text-xs text-gray-600 line-clamp-1">{ev.content}</p>
                        </div>
                      </Link>
                    );
                  }) : (
                    <p className="text-sm text-gray-500 py-4 text-center">No upcoming events</p>
                  )}
                  <Link to="/calendar" className="block text-center text-xs font-semibold text-violet-800 hover:text-violet-950 pt-1">Full Calendar →</Link>
                </div>
              </div>

              <div>
                <div className="bg-violet-900 text-white px-4 py-2 font-semibold text-sm tracking-wide rounded-t-xl">FEATURED PROGRAMS</div>
                <div className="bg-white border border-slate-200 p-4 rounded-b-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { code: 'Academic', img: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=300&q=60' },
                      { code: 'TechPro',  img: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=300&q=60' },
                    ].map((prog, i) => (
                      <Link key={i} to="/senior-high" className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200 hover:border-violet-400 transition-all group">
                        <div className="w-full h-16 overflow-hidden">
                           <img src={prog.img} alt={prog.code} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <p className="text-xs font-semibold text-slate-900 text-center py-2">{prog.code}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: MINI CALENDAR + ANNOUNCEMENTS FEED */}
            <div className="space-y-4">
              <MiniCalendar events={announcements.filter(a => a.category === 'events')} onSelectDay={handleSelectDay} />
              <div>
                <div className="bg-violet-900 text-white px-4 py-2 font-semibold text-sm tracking-wide rounded-t-xl">
                  {selectedDayLabel ? `Events — ${new Date().toLocaleString('en-US',{month:'short'})} ${selectedDayLabel}` : 'ANNOUNCEMENTS'}
                </div>
                <div className="bg-white border border-slate-200 p-4 space-y-3 rounded-b-xl">
                  {(selectedDayLabel ? selectedDateEvents : announcements.slice(0, 5)).map((a, i) => (
                    <div key={i} className="flex items-start gap-2 pb-3 border-b border-violet-100 last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-violet-900">K</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-slate-900">Kiwalan NHS</p>
                        <p className="text-[11px] text-gray-600 leading-tight line-clamp-2">{a.title}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {!selectedDayLabel && announcements.length === 0 && (
                    <p className="text-sm text-gray-500 py-4 text-center">No announcements</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* WHY CHOOSE US */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-violet-800 tracking-widest mb-3">Core Strengths</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-5 leading-tight">
                Why Choose<br />Kiwalan NHS?
              </h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                A holistic learning environment that combines academic rigor with character building and practical skills for every student.
              </p>
              <Link to="/about" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-800 hover:text-violet-950 transition-colors">
                Learn more about us
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" /></svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: content.home_feature_1_title?.content || 'Quality Education', desc: content.home_feature_1_content?.content || 'Comprehensive K-12 curriculum designed to prepare students for success in higher education.', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                { title: content.home_feature_2_title?.content || 'Dedicated Faculty', desc: content.home_feature_2_content?.content || 'Experienced and passionate teachers committed to student growth and academic excellence.', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                { title: content.home_feature_3_title?.content || 'Modern Facilities', desc: content.home_feature_3_content?.content || 'State-of-the-art classrooms, laboratories, and learning spaces to support holistic education.', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                { title: 'Digital Portal', desc: 'Full-featured student portal with grades, attendance, messaging, and real-time notifications.', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              ].map((f, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-violet-300 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-violet-900 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} /></svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{f.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PORTAL FEATURES */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 bg-violet-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-violet-200 tracking-widest mb-3">Digital Platform</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything in One Portal</h2>
            <p className="text-violet-100 max-w-xl mx-auto">Students, teachers, and administrators all have dedicated dashboards with the tools they need.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { role: 'Students', badge: 'bg-white/20 text-white', features: ['View grades & report cards', 'Track attendance records', 'Access learning materials', 'Receive announcements', 'Message teachers & peers'] },
              { role: 'Teachers', badge: 'bg-white/20 text-white', features: ['Input & manage grades', 'Record attendance', 'Upload learning materials', 'Post announcements', 'Communicate with students'] },
              { role: 'Administrators', badge: 'bg-white/20 text-white', features: ['Manage all users & classes', 'View analytics & reports', 'Control enrollment', 'System settings & audit logs', 'Backup & maintenance tools'] },
            ].map((r, i) => (
              <div key={i} className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide mb-4 border border-white/30 ${r.badge}`}>{r.role}</span>
                <ul className="space-y-2.5">
                  {r.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-violet-100">
                      <svg className="w-3.5 h-3.5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-violet-900 text-sm font-bold hover:bg-violet-50 transition-colors shadow-lg">
              Access the Portal
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LOCATION / MAP */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-xs font-semibold text-violet-800 tracking-widest mb-3">Find Us</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-5 leading-tight">
                Visit Kiwalan<br />National High School
              </h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                We welcome prospective students and parents to visit our campus. Our registrar's office is open on school days for enrollment inquiries.
              </p>
              <div className="space-y-4">
                {[
                  { icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', label: 'Address', value: 'Kiwalan, Iligan City, Lanao del Norte, Philippines' },
                  { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Office Hours', value: 'Monday – Friday, 7:00 AM – 5:00 PM' },
                  { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'Email', value: 'info@kiwalan-nhs.edu.ph' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-violet-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-violet-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-violet-800 tracking-widest mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-gray-800">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href="https://maps.google.com/?q=Kiwalan+National+High+School+Iligan+City" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-violet-900 text-white text-sm font-semibold hover:bg-violet-950 transition-colors shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Open in Google Maps
              </a>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-[380px]">
              <iframe
                title="Kiwalan National High School Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3948.2297046439908!2d124.27159847501021!3d8.27992249175451!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x325576cc580e692d%3A0x1ee65da2c86ad0a6!2sKiwalan%20National%20High%20School!5e0!3m2!1sen!2sph!4v1779569511724!5m2!1sen!2sph"
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CTA */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="rounded-3xl bg-violet-950 px-8 py-14 md:px-16 md:py-20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-5">
              <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">Ready to Shape Your Future?</h2>
                <p className="text-violet-100 leading-relaxed">Join a community dedicated to academic excellence and personal growth. Your journey starts here at Kiwalan NHS.</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link to="/enroll" className="px-8 py-4 rounded-xl bg-white text-violet-900 text-sm font-bold hover:bg-violet-50 transition-colors shadow-lg">
                  Enroll Now
                </Link>
                <Link to="/track-enrollment" className="px-8 py-4 rounded-xl border-2 border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition-colors">
                  Track Application
                </Link>
                <Link to="/contact" className="px-8 py-4 rounded-xl border-2 border-white/20 text-white/80 text-sm font-semibold hover:bg-white/5 transition-colors">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image zoom modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-violet-950/85 backdrop-blur-sm" onClick={() => setZoomedImage(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors" onClick={() => setZoomedImage(null)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" loading="lazy" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default HomeDepEd;
