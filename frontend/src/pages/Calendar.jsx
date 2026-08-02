import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api, { MEDIA_ROOT } from '../utils/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import CalendarEventModal from '../components/calendar/CalendarEventModal';

const CATEGORY_CONFIG = {
  general:      { label: 'General',      color: 'bg-slate-100 text-slate-700 border-slate-200',   dot: 'bg-slate-400',    hex: '#94a3b8' },
  academic:     { label: 'Academics',    color: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-500',     hex: '#3b82f6' },
  events:       { label: 'Events',       color: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-500',    hex: '#f59e0b' },
  examinations: { label: 'Examinations', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500',   hex: '#a855f7' },
  exam:         { label: 'Examinations', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500',   hex: '#a855f7' },
  guidance:     { label: 'Guidance',     color: 'bg-teal-50 text-teal-700 border-teal-200',       dot: 'bg-teal-500',     hex: '#14b8a6' },
  sports:       { label: 'Sports',       color: 'bg-orange-50 text-orange-700 border-orange-200',  dot: 'bg-orange-500',   hex: '#f97316' },
  cultural:     { label: 'Cultural',     color: 'bg-pink-50 text-pink-700 border-pink-200',       dot: 'bg-pink-500',     hex: '#ec4899' },
  emergency:    { label: 'Emergency',    color: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-500',      hex: '#ef4444' },
  holiday:      { label: 'Holiday',      color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', hex: '#10b981' },
  meeting:      { label: 'Meeting',      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',  dot: 'bg-indigo-500',   hex: '#6366f1' },
  enrollment:   { label: 'Enrollment',   color: 'bg-cyan-50 text-cyan-700 border-cyan-200',       dot: 'bg-cyan-500',     hex: '#06b6d4' },
  other:        { label: 'Other',        color: 'bg-slate-100 text-slate-600 border-slate-200',   dot: 'bg-slate-400',    hex: '#94a3b8' },
  system_update:{ label: 'System',       color: 'bg-slate-100 text-slate-600 border-slate-200',   dot: 'bg-slate-400',    hex: '#94a3b8' },
};

const PRIORITY_CONFIG = {
  info:      { label: 'Normal',   color: '', dot: 'bg-slate-400' },
  important: { label: 'Important', color: 'border-l-orange-500', dot: 'bg-orange-500' },
  critical:  { label: 'Urgent',   color: 'border-l-red-500', dot: 'bg-red-500' },
};

const FILTER_OPTIONS = [
  { id: 'all',          label: 'All Events',    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { id: 'academic',     label: 'Academics',     icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253' },
  { id: 'examinations', label: 'Exams',         icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'holiday',      label: 'Holidays',      icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { id: 'sports',       label: 'Sports',        icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'cultural',     label: 'Cultural',      icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
  { id: 'meeting',      label: 'Meetings',      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'events',       label: 'School Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

const SCHOOL_DATE_TYPES = [
  { value: 'holiday', label: 'Holiday', icon: '☀️', color: 'text-amber-500' },
  { value: 'weather', label: 'Weather Disruption', icon: '☁️', color: 'text-blue-500' },
  { value: 'break', label: 'School Break', icon: '☕', color: 'text-green-500' },
  { value: 'other', label: 'Other', icon: '⚠️', color: 'text-slate-500' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const isToday = (day, month, year) => {
  const now = new Date();
  return day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const Calendar = ({ mode = 'public' }) => {
  const location = useLocation();
  const { user } = useCurrentUser();
  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState(['all']);
  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('events');

  const [schoolEntries, setSchoolEntries] = useState([]);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editingSchoolEntry, setEditingSchoolEntry] = useState(null);
  const [schoolForm, setSchoolForm] = useState({ date: '', title: '', description: '', type: 'holiday' });
  const [savingSchool, setSavingSchool] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const initialYear = parseInt(queryParams.get('year')) || new Date().getFullYear();
  const initialMonth = (parseInt(queryParams.get('month')) - 1) || new Date().getMonth();
  const [currentMonth, setCurrentMonth] = useState(new Date(initialYear, initialMonth, 1));

  useEffect(() => {
    const qParams = new URLSearchParams(location.search);
    const y = parseInt(qParams.get('year'));
    const m = parseInt(qParams.get('month'));
    if (y && m) {
      const newDate = new Date(y, m - 1, 1);
      if (newDate.getMonth() !== currentMonth.getMonth() || newDate.getFullYear() !== currentMonth.getFullYear()) {
        setCurrentMonth(newDate);
      }
    }
  }, [location.search]);

  useEffect(() => { fetchEvents(); }, [currentMonth, mode]);

  useEffect(() => { if (canManage && activeTab === 'school-dates') fetchSchoolEntries(); }, [activeTab]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const isPublicOnly = mode === 'public';
      const response = await api.get(`/student/calendar/?year=${year}&month=${month}&public_only=${isPublicOnly}`);
      setEvents(response.data);
    } catch {
      setEvents([]);
    } finally { setLoading(false); }
  };

  const fetchSchoolEntries = async () => {
    setSchoolLoading(true);
    try {
      const res = await api.get('/school-calendar/');
      setSchoolEntries(res.data.results || res.data || []);
    } catch {
      toast.error('Failed to load school calendar');
    } finally {
      setSchoolLoading(false);
    }
  };

  const openAddSchoolEntry = () => {
    setEditingSchoolEntry(null);
    setSchoolForm({ date: '', title: '', description: '', type: 'holiday' });
    setShowSchoolForm(true);
  };

  const openEditSchoolEntry = (entry) => {
    setEditingSchoolEntry(entry);
    setSchoolForm({ date: entry.date, title: entry.title, description: entry.description || '', type: entry.type });
    setShowSchoolForm(true);
  };

  const handleSaveSchoolEntry = async () => {
    if (!schoolForm.date || !schoolForm.title) {
      toast.error('Date and title are required');
      return;
    }
    setSavingSchool(true);
    try {
      if (editingSchoolEntry) {
        await api.put(`/school-calendar/${editingSchoolEntry.id}/`, schoolForm);
        toast.success('Updated');
      } else {
        await api.post('/school-calendar/', schoolForm);
        toast.success('Added');
      }
      setShowSchoolForm(false);
      fetchSchoolEntries();
    } catch (err) {
      const msg = err.response?.data?.date?.[0] || err.response?.data?.detail || 'Failed to save';
      toast.error(msg);
    } finally {
      setSavingSchool(false);
    }
  };

  const handleDeleteSchoolEntry = async (id) => {
    if (!window.confirm('Remove this calendar entry?')) return;
    try {
      await api.delete(`/school-calendar/${id}/`);
      toast.success('Removed');
      fetchSchoolEntries();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const filteredEvents = useMemo(() => {
    if (activeFilters.includes('all')) return events;
    return events.filter(e => activeFilters.includes(e.category));
  }, [events, activeFilters]);

  const toggleFilter = (id) => {
    if (id === 'all') {
      setActiveFilters(['all']);
      return;
    }
    setActiveFilters(prev => {
      const next = prev.filter(f => f !== 'all' && f !== id);
      if (!prev.includes(id)) next.push(id);
      return next.length === 0 ? ['all'] : next;
    });
  };

  const getEventsForDay = useCallback((day) => {
    if (!day) return [];
    const target = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    target.setHours(0, 0, 0, 0);
    return filteredEvents.filter(event => {
      const start = new Date(event.date);
      start.setHours(0, 0, 0, 0);
      const end = event.end_date ? new Date(event.end_date) : start;
      end.setHours(0, 0, 0, 0);
      return target >= start && target <= end;
    });
  }, [filteredEvents, currentMonth]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return filteredEvents
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10);
  }, [filteredEvents]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    return {
      totalMonth: events.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length,
      upcoming: upcomingEvents.length,
      exams: events.filter(e => e.category === 'examinations').length,
      holidays: events.filter(e => e.category === 'holiday').length,
    };
  }, [events, upcomingEvents]);

  const goToPrev = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNext = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToToday = () => { setCurrentMonth(new Date()); setSelectedDate(new Date().getDate()); };

  const openEventDetail = (event) => setSelectedEvent(event);
  const openCreateEvent = () => { setEditingEvent(null); setShowEventModal(true); };
  const openEditEvent = (event) => { setEditingEvent(event); setShowEventModal(true); };

  const handleDeleteEvent = async (event) => {
    const result = await Swal.fire({
      title: 'Delete Event?', text: "This will remove the event from the calendar.", icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl' },
    });
    if (result.isConfirmed) {
      try {
        const rawId = event.id?.replace('ann-', '').replace('event-', '') || event.id;
        if (event.type === 'event') {
          await api.delete(`/school-events/${rawId}/`);
        } else {
          await api.delete(`/announcements/${rawId}/`);
        }
        toast.success('Event deleted');
        fetchEvents();
        setSelectedEvent(null);
      } catch { toast.error('Failed to delete'); }
    }
  };

  const handleDuplicateEvent = async (event) => {
    try {
      const rawId = event.id?.replace('ann-', '').replace('event-', '') || event.id;
      if (event.type === 'event') {
        const r = await api.get(`/school-events/${rawId}/`);
        const data = r.data;
        setEditingEvent({
          id: null,
          title: `${data.title} (Copy)`,
          content: data.description || '',
          category: data.category,
          target_audience: data.target_audience,
          event_date: data.start_date ? `${data.start_date}T${data.start_time || '00:00'}` : null,
          end_date: data.end_date ? `${data.end_date}T${data.end_time || '23:59'}` : null,
          status: 'draft',
        });
      } else {
        const r = await api.get(`/announcements/${rawId}/`);
        const data = r.data;
        setEditingEvent({
          ...data,
          id: null,
          title: `${data.title} (Copy)`,
          status: 'draft',
        });
      }
      setShowEventModal(true);
      toast.success('Event loaded — edit and save as new');
    } catch { toast.error('Failed to load event'); }
  };

  const days = getDaysInMonth(currentMonth);
  const isPortal = mode === 'portal';

  return (
    <div className={`animate-fade-in page-bottom-safe min-h-screen ${isPortal ? 'bg-transparent' : 'bg-slate-50'}`}>
      {/* ── Header ── */}
      <div className="bg-white border-b-2 border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">School Calendar</h1>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Events & Academic Schedule</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && activeTab === 'events' && (
                <button onClick={openCreateEvent}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">New Event</span>
                </button>
              )}
              {canManage && activeTab === 'school-dates' && (
                <button onClick={openAddSchoolEntry}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Add Entry</span>
                </button>
              )}
              {!isPortal && (
                <Link to="/" className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Website
                </Link>
              )}
            </div>
          </div>
          {canManage && (
            <div className="flex gap-1 mt-3 bg-slate-100 rounded-xl p-1 w-fit">
              <button onClick={() => setActiveTab('events')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'events' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                Events
              </button>
              <button onClick={() => setActiveTab('school-dates')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'school-dates' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                School Dates
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {activeTab === 'events' && (<>
          {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'This Month', value: stats.totalMonth, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-violet-100 text-violet-700' },
            { label: 'Upcoming', value: stats.upcoming, icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', color: 'bg-blue-100 text-blue-700' },
            { label: 'Examinations', value: stats.exams, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-purple-100 text-purple-700' },
            { label: 'Holidays', value: stats.holidays, icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', color: 'bg-emerald-100 text-emerald-700' },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center shrink-0`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 leading-none">{card.value}</p>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters & View Toggle ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map(f => {
              const isActive = activeFilters.includes(f.id);
              return (
                <button key={f.id} onClick={() => toggleFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isActive
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}>
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {['month', 'week', 'agenda'].map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  viewMode === v ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          {/* ── Calendar Main ── */}
          <div className="flex-1 min-w-0">

            {/* ── Month View ── */}
            {viewMode === 'month' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Month Nav */}
                <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg md:text-xl font-black text-slate-900">
                      {MONTH_NAMES[currentMonth.getMonth()]} <span className="text-violet-600">{currentMonth.getFullYear()}</span>
                    </h2>
                    <button onClick={goToToday}
                      className="px-3 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100 transition-colors border border-violet-200">
                      Today
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={goToPrev} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={goToNext} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-slate-100">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="text-center py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{d}</div>
                  ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7">
                  {days.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const today = day && isToday(day, currentMonth.getMonth(), currentMonth.getFullYear());
                    const isSelected = day === selectedDate;
                    const hasEvents = dayEvents.length > 0;

                    return (
                      <div key={idx}
                        onClick={() => day && setSelectedDate(day)}
                        className={`min-h-[70px] md:min-h-[110px] p-1.5 md:p-2 border-b border-r border-slate-100 transition-all cursor-pointer
                          ${!day ? 'bg-slate-50/50 cursor-default' : 'hover:bg-violet-50/50'}
                          ${isSelected ? 'bg-violet-50' : ''}
                        `}>
                        {day && (
                          <>
                            <div className="flex items-start justify-between mb-1">
                              <span className={`text-xs md:text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                today ? 'bg-violet-600 text-white' : 'text-slate-700'
                              }`}>
                                {day}
                              </span>
                              {hasEvents && (
                                <span className="text-[9px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full">
                                  {dayEvents.length}
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 3).map((event, eIdx) => {
                                const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.general;
                                return (
                                  <div key={eIdx}
                                    onClick={(e) => { e.stopPropagation(); openEventDetail(event); }}
                                    className="text-[8px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded truncate border-l-2 transition-colors hover:opacity-80"
                                    style={{ borderLeftColor: cat.hex, backgroundColor: `${cat.hex}15`, color: cat.hex }}>
                                    {event.title}
                                  </div>
                                );
                              })}
                              {dayEvents.length > 3 && (
                                <p className="text-[8px] font-bold text-slate-400 pl-1">+{dayEvents.length - 3} more</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Week View ── */}
            {viewMode === 'week' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-black text-slate-900">
                    Week of {formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDate || new Date().getDate()))}
                  </h2>
                  <button onClick={goToToday}
                    className="px-3 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100 transition-colors border border-violet-200">
                    Today
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 7 }, (_, i) => {
                    const baseDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDate || new Date().getDate());
                    baseDate.setDate(baseDate.getDate() - baseDate.getDay() + i);
                    const day = baseDate.getDate();
                    const dayEvents = getEventsForDay(day);
                    const today = isToday(day, baseDate.getMonth(), baseDate.getFullYear());

                    return (
                      <div key={i} className={`flex items-stretch min-h-[80px] ${today ? 'bg-violet-50/50' : ''}`}>
                        <div className="w-20 md:w-24 flex flex-col items-center justify-center border-r border-slate-100 shrink-0 py-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{DAY_NAMES[baseDate.getDay()]}</span>
                          <span className={`text-xl font-black ${today ? 'text-violet-600' : 'text-slate-800'}`}>{day}</span>
                        </div>
                        <div className="flex-1 p-3 space-y-2">
                          {dayEvents.length > 0 ? dayEvents.map((event, eIdx) => {
                            const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.general;
                            return (
                              <div key={eIdx} onClick={() => openEventDetail(event)}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 hover:border-violet-200 hover:bg-violet-50/50 cursor-pointer transition-all">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.hex }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">{event.title}</p>
                                  <p className="text-[11px] text-slate-400">{formatTime(event.date)}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>{cat.label}</span>
                              </div>
                            );
                          }) : (
                            <p className="text-xs text-slate-300 font-medium pt-2">No events</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Agenda View ── */}
            {viewMode === 'agenda' && (
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
                    <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-bold text-slate-400">No upcoming events</p>
                  </div>
                ) : (
                  upcomingEvents.map((event, idx) => {
                    const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.general;
                    const pri = PRIORITY_CONFIG[event.priority] || PRIORITY_CONFIG.info;
                    const eventDate = new Date(event.date);
                    const isSameDay = idx > 0 && formatDate(event.date) === formatDate(upcomingEvents[idx - 1].date);

                    return (
                      <div key={event.id || idx}>
                        {!isSameDay && (
                          <div className="flex items-center gap-3 mt-4 mb-2">
                            <span className="text-sm font-black text-slate-900">{formatDate(event.date)}</span>
                            <span className="flex-1 h-px bg-slate-200" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{upcomingEvents.filter(e => formatDate(e.date) === formatDate(event.date)).length} events</span>
                          </div>
                        )}
                        <div onClick={() => openEventDetail(event)}
                          className={`bg-white rounded-xl border border-slate-200 p-4 hover:border-violet-200 hover:shadow-md cursor-pointer transition-all ${pri.color ? `border-l-4 ${pri.color}` : ''}`}>
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-violet-50 flex flex-col items-center justify-center shrink-0 border border-violet-100">
                              <span className="text-[9px] font-bold text-violet-600 uppercase leading-none">
                                {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                              </span>
                              <span className="text-lg font-black text-violet-700 leading-tight">{eventDate.getDate()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-sm font-bold text-slate-900 truncate">{event.title}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>{cat.label}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  {formatTime(event.date)}
                                </span>
                                {event.end_date && (
                                  <span>– {formatTime(event.end_date)}</span>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{event.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <aside className="hidden lg:block w-80 shrink-0 space-y-4">
            {/* Legend */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Event Types</h3>
              <div className="space-y-2">
                {Object.entries(CATEGORY_CONFIG).filter(([k]) => !['general', 'system_update', 'exam', 'other'].includes(k)).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.hex }} />
                    <span className="text-xs font-semibold text-slate-700">{cfg.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Date Events */}
            {selectedDate && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                  {getEventsForDay(selectedDate).length > 0 ? getEventsForDay(selectedDate).map((event, idx) => {
                    const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.general;
                    return (
                      <div key={idx} onClick={() => openEventDetail(event)}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: cat.hex }} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{event.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{formatTime(event.date)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs text-slate-400 font-medium">No events on this day</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 bg-violet-600 rounded-full animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">Upcoming Events</h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                {upcomingEvents.length > 0 ? upcomingEvents.map((event, idx) => {
                  const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.general;
                  const pri = PRIORITY_CONFIG[event.priority] || PRIORITY_CONFIG.info;
                  const eventDate = new Date(event.date);
                  return (
                    <div key={idx} onClick={() => openEventDetail(event)}
                      className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${pri.color ? `border-l-3 border-l-${pri.dot.replace('bg-', '')}` : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-50 flex flex-col items-center justify-center shrink-0 border border-violet-100">
                          <span className="text-[8px] font-bold text-violet-600 uppercase leading-none">
                            {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-sm font-black text-violet-700 leading-tight">{eventDate.getDate()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{event.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cat.color}`}>{cat.label}</span>
                            {event.priority === 'critical' && (
                              <span className="text-[10px] font-bold text-red-600">Urgent</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-slate-400 font-medium">No upcoming events</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
        </>)}

        {activeTab === 'school-dates' && canManage && (
          <div className="space-y-4">
            {showSchoolForm && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{editingSchoolEntry ? 'Edit Entry' : 'New Entry'}</h3>
                  <button onClick={() => setShowSchoolForm(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
                      <input type="date" value={schoolForm.date} onChange={e => setSchoolForm(p => ({ ...p, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
                      <select value={schoolForm.type} onChange={e => setSchoolForm(p => ({ ...p, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none">
                        {SCHOOL_DATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                    <input type="text" value={schoolForm.title} onChange={e => setSchoolForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Christmas Day, Typhoon Suspension"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                    <textarea value={schoolForm.description} onChange={e => setSchoolForm(p => ({ ...p, description: e.target.value }))}
                      rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowSchoolForm(false)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                    <button onClick={handleSaveSchoolEntry} disabled={savingSchool}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors disabled:opacity-50">
                      {savingSchool ? 'Saving...' : editingSchoolEntry ? 'Update' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {schoolLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : schoolEntries.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-bold text-slate-400">No school calendar entries yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schoolEntries.map(entry => {
                  const typeInfo = SCHOOL_DATE_TYPES.find(t => t.value === entry.type) || SCHOOL_DATE_TYPES[3];
                  return (
                    <div key={entry.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`text-xl ${typeInfo.color}`}>{typeInfo.icon}</span>
                          <div>
                            <div className="font-medium text-sm text-slate-900">{entry.title}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium">{typeInfo.label}</span>
                            </div>
                            {entry.description && <div className="text-xs text-slate-400 mt-0.5">{entry.description}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditSchoolEntry(entry)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteSchoolEntry(entry.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Event Detail Modal ── */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                {(() => {
                  const cat = CATEGORY_CONFIG[selectedEvent.category] || CATEGORY_CONFIG.general;
                  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>{cat.label}</span>;
                })()}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedEvent.type === 'event'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-violet-50 text-violet-700 border-violet-200'
                }`}>
                  {selectedEvent.type === 'event' ? 'School Event' : 'Announcement'}
                </span>
                {selectedEvent.priority === 'critical' && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Urgent</span>
                )}
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">{selectedEvent.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-4">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {formatDate(selectedEvent.date)}
                </span>
                {selectedEvent.end_date && (
                  <span className="text-slate-400">– {formatDate(selectedEvent.end_date)}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-5">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {selectedEvent.is_all_day ? 'All Day' : formatTime(selectedEvent.date)}
                  {!selectedEvent.is_all_day && selectedEvent.end_date && ` – ${formatTime(selectedEvent.end_date)}`}
                </span>
                {selectedEvent.location && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {selectedEvent.location}
                  </span>
                )}
              </div>
              {selectedEvent.description && (
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">{selectedEvent.description}</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {canManage && selectedEvent.type !== 'event' && (
                  <>
                    <button onClick={() => openEditEvent(selectedEvent)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteEvent(selectedEvent)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">
                      Delete
                    </button>
                    <button onClick={() => handleDuplicateEvent(selectedEvent)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors">
                      Duplicate
                    </button>
                  </>
                )}
                {canManage && selectedEvent.type === 'event' && (
                  <button onClick={() => handleDeleteEvent(selectedEvent)}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">
                    Delete
                  </button>
                )}
              </div>
              {selectedEvent.type !== 'event' && (
                <Link to={`/announcements`} className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100 transition-colors">
                  View in Announcements →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Event Modal ── */}
      {canManage && (
        <CalendarEventModal
          open={showEventModal}
          onClose={() => { setShowEventModal(false); setEditingEvent(null); }}
          event={editingEvent}
          onSaved={() => { setShowEventModal(false); setEditingEvent(null); fetchEvents(); }}
        />
      )}
    </div>
  );
};

export default Calendar;
