import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { LoadingSpinner, Modal, getModalZ } from '../components/ui';
import BellPeriodModal from '../components/schedule/BellPeriodModal';

const DAYS = ['monday','tuesday','wednesday','thursday','friday'];
const WEEKDAYS = ['monday','tuesday','wednesday','thursday','friday'];
const DAY_FULL = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday' };
const DAY_SHORT = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri' };

const SLOT_TYPES = [
  { value: 'class',     label: 'Class Period', color: 'bg-violet-100 text-violet-700 border-violet-200', barBg: '#f5f3ff', barBorder: '#c4b5fd', barText: '#6d28d9' },
  { value: 'recess',    label: 'Recess',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200', barBg: '#ecfdf5', barBorder: '#6ee7b7', barText: '#047857' },
  { value: 'lunch',     label: 'Lunch Break',  color: 'bg-amber-100 text-amber-700 border-amber-200', barBg: '#fffbeb', barBorder: '#fcd34d', barText: '#b45309' },
  { value: 'vacant',    label: 'Vacant',       color: 'bg-slate-100 text-slate-500 border-slate-200', barBg: '#f8fafc', barBorder: '#e2e8f0', barText: '#64748b' },
  { value: 'assembly',  label: 'Assembly',     color: 'bg-indigo-100 text-indigo-700 border-indigo-200', barBg: '#eef2ff', barBorder: '#a5b4fc', barText: '#4338ca' },
  { value: 'pe',        label: 'PE / Sports',  color: 'bg-rose-100 text-rose-700 border-rose-200', barBg: '#fff1f2', barBorder: '#fda4af', barText: '#be123c' },
];
const SLOT_TYPE_MAP = Object.fromEntries(SLOT_TYPES.map(t => [t.value, t]));

// All slot types that are NOT assignable class periods
const BREAK_SLOT_TYPES = new Set(['recess', 'lunch', 'vacant', 'assembly', 'pe']);

// Detect break period from either slot_type or label (fallback for legacy data)
const BREAK_LABELS = /recess|lunch|break|vacant|assembly|pe\b|sport/i;
const isBreakPeriod = (slot_type, label) => {
  if (slot_type && BREAK_SLOT_TYPES.has(slot_type)) return true;
  if (!slot_type && label && BREAK_LABELS.test(label)) return true;
  return false;
};

const DEFAULT_PERIODS = [
  { start_time: '07:30', end_time: '08:30', label: 'Period 1', slot_type: 'class' },
  { start_time: '08:30', end_time: '09:30', label: 'Period 2', slot_type: 'class' },
  { start_time: '09:30', end_time: '09:45', label: 'Recess',   slot_type: 'recess' },
  { start_time: '09:45', end_time: '10:45', label: 'Period 3', slot_type: 'class' },
  { start_time: '10:45', end_time: '11:45', label: 'Period 4', slot_type: 'class' },
  { start_time: '11:45', end_time: '13:00', label: 'Lunch',    slot_type: 'lunch' },
  { start_time: '13:00', end_time: '14:00', label: 'Period 5', slot_type: 'class' },
  { start_time: '14:00', end_time: '15:00', label: 'Period 6', slot_type: 'class' },
  { start_time: '15:00', end_time: '16:00', label: 'Period 7', slot_type: 'class' },
];

const normalizeTime = (v) => {
  if (!v) return '';
  const m = String(v).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2,'0')}:${m[2]}` : String(v).slice(0,5);
};
const periodKey = (s, e) => `${normalizeTime(s)}-${normalizeTime(e)}`;
const slotExists = (slots, day, s, e) => slots.some(t => t.day === day && periodKey(t.start_time, t.end_time) === periodKey(s, e));
const durationMinutes = (s, e) => { const [sh,sm] = normalizeTime(s).split(':').map(Number); const [eh,em] = normalizeTime(e).split(':').map(Number); return (eh*60+em)-(sh*60+sm); };
const formatDuration = (min) => min >= 60 ? `${Math.floor(min/60)}h ${min%60 ? min%60+'m' : ''}`.trim() : `${min}m`;

const COLORS = [
  'bg-violet-50 border-violet-200 text-violet-800',
  'bg-violet-50 border-violet-200 text-violet-800',
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-amber-50 border-amber-200 text-amber-800',
  'bg-rose-50 border-rose-200 text-rose-800',
  'bg-indigo-50 border-indigo-200 text-indigo-800',
  'bg-teal-50 border-teal-200 text-teal-800',
  'bg-orange-50 border-orange-200 text-orange-800',
];

const emptyForm = { classroom:'', subject:'', teacher:'', room:'', time_slot:'', academic_year:'', semester:'', notes:'', is_vacant: false };

const Field = ({ label, required, children }) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
      {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const Select = ({ value, onChange, children, required }) => (
  <select required={required} value={value} onChange={onChange}
    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all">
    {children}
  </select>
);

export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeAY, setActiveAY] = useState('');
  const [filterClassroom, setFilterClassroom] = useState('');
  const [filterDay, setFilterDay] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showSlotPanel, setShowSlotPanel] = useState(false);
  const [showRoomPanel, setShowRoomPanel] = useState(false);
  const [roomForm, setRoomForm] = useState({ name:'', building:'', capacity:40, room_type:'classroom' });
  const [slotForm, setSlotForm] = useState({ days: [...WEEKDAYS], start_time:'07:30', end_time:'08:30', label:'', slot_type:'class' });
  const [savingSlot, setSavingSlot] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [classroomAssignments, setClassroomAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [teacherLocked, setTeacherLocked] = useState(false);
  const [addingCell, setAddingCell] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [showConflicts, setShowConflicts] = useState(false);

  const [editingSlot, setEditingSlot] = useState(null);
  const [editSlotForm, setEditSlotForm] = useState({ start_time:'', end_time:'', label:'', day:'', slot_type:'class' });
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('schedTutorialDone'));
  const [tutorialStep, setTutorialStep] = useState(0);
  const [mobileSelectedDay, setMobileSelectedDay] = useState(() => {
    const jsDay = new Date().getDay();
    return (jsDay >= 1 && jsDay <= 5) ? DAYS[jsDay - 1] : 'monday';
  });

  const fireStackedAlert = useCallback((options) => Swal.fire({
    heightAuto: false,
    ...options,
    didOpen: (popup) => {
      const container = Swal.getContainer();
      if (container) {
        container.style.zIndex = String(getModalZ());
      }
      options.didOpen?.(popup);
    },
  }), []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [schR, roomR, clsR, subR, tchR, ayR] = await Promise.all([
        api.get('/schedules/'), api.get('/rooms/'),
        api.get('/classrooms/'), api.get('/subjects/'), api.get('/users/?role=staff'),
        api.get('/admin/academic-years/'),
      ]);
      setSchedules(schR.data.results || schR.data);
      setRooms(roomR.data.results || roomR.data);
      setClassrooms(clsR.data.results || clsR.data);
      setSubjects(subR.data.results || subR.data);
      setTeachers(tchR.data.results || tchR.data);
      const ays = ayR.data.results || ayR.data;
      setAcademicYears(ays);
      const active = ays.find(a => a.is_active);
      if (active && !activeAY) setActiveAY(String(active.id));
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchTimeSlots = useCallback(async (classroomId) => {
    try {
      const url = classroomId ? `/time-slots/?classroom=${classroomId}` : '/time-slots/';
      const res = await api.get(url);
      setTimeSlots(res.data.results || res.data);
    } catch { toast.error('Failed to load time slots'); }
  }, []);

  useEffect(() => {
    fetchTimeSlots(filterClassroom || null);
  }, [filterClassroom, fetchTimeSlots]);

  useEffect(() => {
    if (form.academic_year) {
      api.get(`/admin/semesters/?academic_year=${form.academic_year}`)
        .then(r => setSemesters(r.data.results || r.data)).catch(() => {});
    }
  }, [form.academic_year]);

  useEffect(() => {
    if (!form.classroom) { setClassroomAssignments([]); return; }
    setLoadingAssignments(true);
    api.get(`/classroom-subjects/by_classroom/?classroom_id=${form.classroom}`)
      .then(r => {
        const data = r.data.results || r.data;
        setClassroomAssignments(data);
        setForm(f => {
          const ids = data.map(a => String(a.subject));
          const sub = ids.includes(String(f.subject)) ? f.subject : '';
          const match = data.find(a => String(a.subject) === String(sub));
          const autoTeacher = match ? String(match.teacher) : '';
          if (autoTeacher) setTeacherLocked(true);
          return { ...f, subject: sub, teacher: autoTeacher };
        });
      })
      .catch(() => setClassroomAssignments([]))
      .finally(() => setLoadingAssignments(false));
  }, [form.classroom]);

  const subjectColorMap = useMemo(() => {
    const m = {};
    subjects.forEach((s, i) => { m[s.id] = COLORS[i % COLORS.length]; });
    return m;
  }, [subjects]);

  const filtered = useMemo(() => schedules.filter(s => {
    if (activeAY && String(s.academic_year) !== activeAY) return false;
    if (filterClassroom && String(s.classroom) !== filterClassroom) return false;
    if (filterDay && s.time_slot_detail?.day !== filterDay) return false;
    return true;
  }), [schedules, activeAY, filterClassroom, filterDay]);

  const sortedSlots = useMemo(() =>
    [...timeSlots].sort((a, b) => {
      const d = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      return d !== 0 ? d : a.start_time.localeCompare(b.start_time);
    }), [timeSlots]);

  const uniquePeriods = useMemo(() => {
    const map = new Map();
    sortedSlots.forEach(ts => {
      const k = periodKey(ts.start_time, ts.end_time);
      if (!map.has(k)) {
        // Derive the effective slot_type: use the stored value if present,
        // otherwise infer from the label for legacy slots saved without slot_type.
        const rawType = ts.slot_type != null && ts.slot_type !== '' ? ts.slot_type : null;
        const effectiveType = rawType ?? (BREAK_LABELS.test(ts.label || '') ? ts.label.toLowerCase().replace(/\s+break$/, '').trim() : 'class');
        map.set(k, {
          start_time: ts.start_time, end_time: ts.end_time, label: ts.label,
          slot_type: effectiveType,
          start_display: ts.start_time_display || normalizeTime(ts.start_time),
          end_display: ts.end_time_display || normalizeTime(ts.end_time),
        });
      }
    });
    return [...map.values()].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [sortedSlots]);

  const getSlotForCell = useCallback((day, period) =>
    timeSlots.find(ts => ts.day === day && periodKey(ts.start_time, ts.end_time) === periodKey(period.start_time, period.end_time)),
  [timeSlots]);

  const hasSlotForCell = useCallback((day, period) => Boolean(getSlotForCell(day, period)), [getSlotForCell]);

  const getCellSchedules = useCallback((day, period) => {
    const slot = getSlotForCell(day, period);
    if (!slot) return [];
    return filtered.filter(s => String(s.time_slot) === String(slot.id));
  }, [filtered, getSlotForCell]);

  const classroomScheduleCounts = useMemo(() => {
    const c = {};
    filtered.forEach(s => { c[s.classroom] = (c[s.classroom] || 0) + 1; });
    return c;
  }, [filtered]);

  const ensureTimeSlot = useCallback(async (day, period) => {
    const existing = getSlotForCell(day, period);
    if (existing) return existing;
    try {
      const payload = {
        day, start_time: normalizeTime(period.start_time), end_time: normalizeTime(period.end_time), label: period.label || '',
      };
      if (filterClassroom) payload.classroom = filterClassroom;
      const res = await api.post('/time-slots/', payload);
      setTimeSlots(prev => [...prev, res.data]);
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.non_field_errors?.[0] || 'Could not create time slot');
      return null;
    }
  }, [getSlotForCell, filterClassroom]);

  const openCreate = useCallback((slotId = '', prefill = {}) => {
    const ay = academicYears.find(a => String(a.id) === activeAY) || academicYears.find(a => a.is_active);
    setEditItem(null);
    setTeacherLocked(false);
    setForm({ ...emptyForm, time_slot: slotId, academic_year: ay ? String(ay.id) : '', classroom: prefill.classroom || filterClassroom || '', ...prefill });
    setShowForm(true);
  }, [academicYears, activeAY, filterClassroom]);

  const openCreateAtCell = useCallback(async (day, period) => {
    if (!filterClassroom) { toast.error('Select a section first'); return; }
    // Break periods (lunch, recess, etc.) do not need subject assignment
    if (isBreakPeriod(period.slot_type, period.label)) return;
    setAddingCell(`${day}-${period.start_time}-${period.end_time}`);
    try {
      const slot = await ensureTimeSlot(day, period);
      if (!slot) return;
      const sec = classrooms.find(c => String(c.id) === filterClassroom);
      openCreate(String(slot.id), { classroom: filterClassroom });
      toast(`Adding class to ${sec?.name || 'section'} — ${DAY_FULL[day]} ${period.start_display}`, { icon: 'info' });
    } finally { setAddingCell(''); }
  }, [filterClassroom, ensureTimeSlot, openCreate, classrooms]);

  const openEdit = useCallback((s) => {
    setEditItem(s);
    setTeacherLocked(false);
    setForm({
      classroom: String(s.classroom), subject: String(s.subject), teacher: String(s.teacher),
      room: s.room ? String(s.room) : '', time_slot: String(s.time_slot),
      academic_year: String(s.academic_year), semester: s.semester ? String(s.semester) : '', notes: s.notes || '',
    });
    setShowForm(true);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.room) delete payload.room;
      if (!payload.semester) delete payload.semester;
      // Vacant slots don't need subject/teacher
      if (payload.is_vacant) {
        delete payload.subject;
        delete payload.teacher;
        payload.notes = payload.notes || 'Vacant';
      }
      delete payload.is_vacant;
      // Prevent assigning subjects to non-class slots (lunch, recess, etc.)
      if (payload.time_slot) {
        const slot = timeSlots.find(ts => String(ts.id) === String(payload.time_slot));
        if (slot && isBreakPeriod(slot.slot_type, slot.label)) {
          toast.error('Cannot assign a subject to a break period (lunch, recess, etc.)');
          setSaving(false);
          return;
        }
      }
      if (editItem) {
        await api.patch(`/schedules/${editItem.id}/`, payload);
        toast.success('Schedule updated');
      } else {
        await api.post('/schedules/', payload);
        toast.success('Class assigned');
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      const d = err.response?.data;
      toast.error(d?.non_field_errors?.[0] || d?.detail || Object.values(d||{})?.[0]?.[0] || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    const r = await fireStackedAlert({ title:'Delete schedule?', text:name||'This cannot be undone.', icon:'warning', showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:'Delete', customClass:{popup:'rounded-2xl'} });
    if (!r.isConfirmed) return;
    try { await api.delete(`/schedules/${id}/`); toast.success('Deleted'); fetchAll(); }
    catch { toast.error('Failed to delete'); }
  };

  const clearAllSchedules = async () => {
    const section = classrooms.find(c => String(c.id) === filterClassroom);
    const sectionName = section?.name || 'this section';
    const count = filtered.length;
    const r = await fireStackedAlert({ title:`Clear all classes in ${sectionName}?`, text:`This will remove ${count} schedule assignment${count === 1 ? '' : 's'}. This cannot be undone.`, icon:'warning', showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:'Clear All', customClass:{popup:'rounded-2xl'} });
    if (!r.isConfirmed) return;
    setSaving(true);
    try {
      const ids = filtered.map(s => s.id);
      await Promise.all(ids.map(id => api.delete(`/schedules/${id}/`)));
      toast.success(`Cleared ${ids.length} assignment${ids.length === 1 ? '' : 's'}`);
      fetchAll();
    } catch { toast.error('Failed to clear schedules'); }
    finally { setSaving(false); }
  };

  const clearAllTimeSlots = async () => {
    const count = timeSlots.length;
    if (!count) return;
    const r = await fireStackedAlert({ title:'Delete all time slots?', text:`This will remove ${count} time slot${count === 1 ? '' : 's'} and any linked schedules. This cannot be undone.`, icon:'warning', showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:'Delete All', customClass:{popup:'rounded-2xl'} });
    if (!r.isConfirmed) return;
    setSavingSlot(true);
    try {
      await Promise.all(timeSlots.map(s => api.delete(`/time-slots/${s.id}/`)));
      setTimeSlots([]);
      toast.success(`Deleted ${count} time slot${count === 1 ? '' : 's'}`);
    } catch { toast.error('Failed to delete time slots'); }
    finally { setSavingSlot(false); }
  };

  const applyStandardBell = async (incSat = false) => {
    const days = incSat ? DAYS : WEEKDAYS;
    setSavingSlot(true);
    let created = 0; let deleted = 0; const n = [];
    const standardKeys = new Set(DEFAULT_PERIODS.map(p => `${normalizeTime(p.start_time)}-${normalizeTime(p.end_time)}`));
    try {
      for (const p of DEFAULT_PERIODS) {
        for (const d of days) {
          if (slotExists(timeSlots, d, p.start_time, p.end_time)) continue;
          const payload = { day: d, start_time: normalizeTime(p.start_time), end_time: normalizeTime(p.end_time), label: p.label || '', slot_type: p.slot_type || 'class' };
          if (filterClassroom) payload.classroom = filterClassroom;
          const r = await api.post('/time-slots/', payload);
          n.push(r.data); created++;
        }
      }
      for (const slot of timeSlots) {
        if (!days.includes(slot.day)) continue;
        if (filterClassroom && String(slot.classroom) !== String(filterClassroom)) continue;
        const key = `${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`;
        if (!standardKeys.has(key)) {
          await api.delete(`/time-slots/${slot.id}/`);
          deleted++;
        }
      }
      if (created || deleted) {
        setTimeSlots(prev => [...prev.filter(s => {
          if (!days.includes(s.day)) return true;
          if (filterClassroom && String(s.classroom) !== String(filterClassroom)) return true;
          const key = `${normalizeTime(s.start_time)}-${normalizeTime(s.end_time)}`;
          return standardKeys.has(key);
        }), ...n]);
        const parts = [];
        if (created) parts.push(`Created ${created}`);
        if (deleted) parts.push(`Removed ${deleted} non-standard`);
        toast.success(parts.join(' · '));
      } else toast.success('Standard schedule already set up');
    } catch { toast.error('Failed to apply bell schedule'); }
    finally { setSavingSlot(false); }
  };

  const fillMissingSlots = async () => {
    if (!uniquePeriods.length) { toast.error('Add at least one period first'); return; }
    setSavingSlot(true);
    let c = 0; const n = [];
    try {
      for (const p of uniquePeriods) {
        for (const d of WEEKDAYS) {
          if (hasSlotForCell(d, p)) continue;
          const payload = { day: d, start_time: normalizeTime(p.start_time), end_time: normalizeTime(p.end_time), label: p.label||'', slot_type: p.slot_type || 'class' };
          if (filterClassroom) payload.classroom = filterClassroom;
          const r = await api.post('/time-slots/', payload);
          n.push(r.data); c++;
        }
      }
      if (c) { setTimeSlots(prev => [...prev, ...n]); toast.success(`Filled ${c} missing slots`); }
      else toast.success('All weekday periods already complete');
    } catch { toast.error('Failed to fill gaps'); }
    finally { setSavingSlot(false); }
  };

  const saveSlotBulk = async (e) => {
    e.preventDefault();
    if (!slotForm.days.length) { toast.error('Select at least one day'); return; }
    setSavingSlot(true);
    let c = 0; let sk = 0; const n = [];
    try {
      for (const d of slotForm.days) {
        if (slotExists(timeSlots, d, slotForm.start_time, slotForm.end_time)) { sk++; continue; }
        const payload = { day: d, start_time: slotForm.start_time, end_time: slotForm.end_time, label: slotForm.label, slot_type: slotForm.slot_type || 'class' };
        if (filterClassroom) payload.classroom = filterClassroom;
        const r = await api.post('/time-slots/', payload);
        n.push(r.data); c++;
      }
      if (c) { setTimeSlots(prev => [...prev, ...n]); toast.success(`Added ${c} period(s)${sk ? ` · ${sk} skipped` : ''}`); setSlotForm(f => ({...f, label:''})); }
      else toast.error('This period already exists on all selected days');
    } catch { toast.error('Failed to add time slots'); }
    finally { setSavingSlot(false); }
  };

  const deleteSlot = async (id, label) => {
    const r = await fireStackedAlert({ title:`Delete "${label}"?`, text:'Schedules using this slot will be affected.', icon:'warning', showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:'Delete', customClass:{popup:'rounded-2xl'} });
    if (!r.isConfirmed) return;
    try {
      await api.delete(`/time-slots/${id}/`);
      toast.success('Deleted');
      setTimeSlots(prev => prev.filter(t => t.id !== id));
      if (editingSlot && String(editingSlot.id) === String(id)) cancelEditSlot();
    }
    catch { toast.error('Failed to delete'); }
  };

  const saveRoom = async (e) => {
    e.preventDefault(); setSavingRoom(true);
    try { await api.post('/rooms/', roomForm); toast.success('Room added'); setRoomForm({ name:'', building:'', capacity:40, room_type:'classroom' }); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.name?.[0] || 'Failed to add room'); }
    finally { setSavingRoom(false); }
  };

  const deleteRoom = async (id, name) => {
    const r = await fireStackedAlert({ title:`Delete "${name}"?`, text:'Schedules using this room will lose their assignment.', icon:'warning', showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:'Delete', customClass:{popup:'rounded-2xl'} });
    if (!r.isConfirmed) return;
    try { await api.delete(`/rooms/${id}/`); toast.success('Deleted'); fetchAll(); }
    catch { toast.error('Failed to delete'); }
  };

  const checkConflicts = async () => {
    const ay = academicYears.find(a => String(a.id) === activeAY || a.is_active);
    if (!ay) { toast.error('Select an academic year first'); return; }
    try {
      const r = await api.get(`/schedules/conflict_check/?academic_year=${ay.id}`);
      setConflicts(r.data.conflicts || []);
      setShowConflicts(true);
      if (r.data.total === 0) toast.success('No conflicts found!');
      else toast.error(`${r.data.total} conflict(s) detected`);
    } catch { toast.error('Conflict check failed'); }
  };

  const startEditSlot = useCallback((slot) => {
    setEditingSlot(slot);
    setEditSlotForm({ start_time: slot.start_time, end_time: slot.end_time, label: slot.label || '', day: slot.day, slot_type: slot.slot_type || 'class' });
  }, []);

  const cancelEditSlot = useCallback(() => {
    setEditingSlot(null);
    setEditSlotForm({ start_time:'', end_time:'', label:'', day:'', slot_type:'class' });
  }, []);

  const saveEditSlot = async () => {
    if (!editingSlot) return;
    setSavingSlot(true);
    try {
      const res = await api.patch(`/time-slots/${editingSlot.id}/`, {
        start_time: editSlotForm.start_time,
        end_time: editSlotForm.end_time,
        label: editSlotForm.label,
        day: editSlotForm.day,
        slot_type: editSlotForm.slot_type || 'class',
      });
      setTimeSlots(prev => prev.map(t => t.id === editingSlot.id ? { ...t, ...res.data } : t));
      toast.success('Time slot updated');
      cancelEditSlot();
    } catch (err) {
      toast.error(err.response?.data?.non_field_errors?.[0] || 'Failed to update');
    } finally { setSavingSlot(false); }
  };

  const applyToAllDays = useCallback(async (period) => {
    setSavingSlot(true);
    let c = 0; const n = [];
    try {
      for (const d of WEEKDAYS) {
        if (hasSlotForCell(d, period)) continue;
        const payload = { day: d, start_time: normalizeTime(period.start_time), end_time: normalizeTime(period.end_time), label: period.label||'', slot_type: period.slot_type || 'class' };
        if (filterClassroom) payload.classroom = filterClassroom;
        const r = await api.post('/time-slots/', payload);
        n.push(r.data); c++;
      }
      if (c) { setTimeSlots(prev => [...prev, ...n]); toast.success(`Added ${c} missing day(s)`); }
      else toast.success('All days already present');
    } catch { toast.error('Failed to add'); }
    finally { setSavingSlot(false); }
  }, [hasSlotForCell, filterClassroom]);

  const tutorialSteps = [
    { icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', title:'Bell Periods', desc:'Define your school\'s daily class periods here.' },
    { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title:'Quick Setup', desc:'Click "Apply Standard Day" to create 7 periods (Mon-Fri) instantly.' },
    { icon: 'M12 4v16m8-8H4', title:'Custom Period', desc:'Add periods manually with label, time, and day selection.' },
    { icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', title:'Overview Grid', desc:'Review all periods across the week. Edit or delete as needed.' },
    { icon: 'M5 13l4 4L19 7', title:'All Set!', desc:'Close this and start assigning classes to time slots.' },
  ];

  const nextTutorial = () => {
    if (tutorialStep < tutorialSteps.length - 1) setTutorialStep(s => s + 1);
    else { setShowTutorial(false); localStorage.setItem('schedTutorialDone','1'); }
  };
  const prevTutorial = () => setTutorialStep(s => Math.max(0, s - 1));
  const dismissTutorial = () => { setShowTutorial(false); localStorage.setItem('schedTutorialDone','1'); };

  const needsTimeSlots = timeSlots.length === 0;
  const needsClassrooms = classrooms.length === 0;
  const isSetupComplete = !needsTimeSlots && !needsClassrooms;
  const hasSchedules = filtered.length > 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner />
    </div>
  );

  return (
    <div className="page-bottom-safe bg-slate-50/50">

      {/* ── Portal-style header ── */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 mb-4 md:mb-6">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">Academic Scheduling</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Bell Schedules · Rooms · Timetables
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Academic year selector */}
            <select value={activeAY} onChange={e => setActiveAY(e.target.value)}
              className="hidden sm:block px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-slate-700">
              <option value="">All Years</option>
              {academicYears.map(a => (
                <option key={a.id} value={String(a.id)}>
                  {a.name}{a.is_active ? ' ✓' : ''}
                </option>
              ))}
            </select>

            {/* Conflict check */}
            <button type="button" onClick={checkConflicts}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="hidden sm:inline">Check Conflicts</span>
              <span className="sm:hidden">Conflicts</span>
            </button>

            {/* Time Slots */}
            <button type="button" onClick={() => setShowSlotPanel(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Time Slots</span>
              <span className="sm:hidden">Slots</span>
            </button>

            {/* Rooms */}
            <button type="button" onClick={() => setShowRoomPanel(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-all shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="hidden sm:inline">Rooms</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-2 md:px-6 space-y-4 md:space-y-5 pb-6">
      {/* Mobile year selector */}
      <div className="sm:hidden">
        <select value={activeAY} onChange={e => setActiveAY(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/40">
          <option value="">All Years</option>
          {academicYears.map(a => <option key={a.id} value={String(a.id)}>{a.name}{a.is_active ? ' (Active)' : ''}</option>)}
        </select>
      </div>

      {/* ── Setup Wizard (only when incomplete) ── */}
      {!isSetupComplete && (
        <div className="bg-gradient-to-r from-violet-50 to-violet-100 border border-violet-200 rounded-2xl p-5 md:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Quick Setup Required</h2>
              <p className="text-xs text-slate-600 mt-0.5">Complete these steps before building timetables. Takes about 1 minute.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1: Bell Schedule */}
            <div className={`relative p-4 rounded-xl border-2 transition-all ${needsTimeSlots ? 'border-violet-400 bg-white shadow-md' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${needsTimeSlots ? 'bg-violet-600 text-white' : 'bg-emerald-500 text-white'}`}>
                  {needsTimeSlots ? '1' : '\u2713'}
                </div>
                <span className={`text-xs font-bold ${needsTimeSlots ? 'text-violet-800' : 'text-emerald-700'}`}>Bell Schedule</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Define the daily class periods (e.g. 7:30-8:30 AM)</p>
              {needsTimeSlots ? (
                <button type="button" onClick={() => applyStandardBell(false)} disabled={savingSlot}
                  className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-all">
                  {savingSlot ? 'Setting up...' : 'Apply Standard 7-Period Day'}
                </button>
              ) : (
                <p className="text-[11px] text-emerald-600 font-semibold">{timeSlots.length} time slots configured</p>
              )}
            </div>

            {/* Step 2: Classrooms */}
            <div className={`relative p-4 rounded-xl border-2 transition-all ${needsClassrooms ? 'border-slate-300 bg-white' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${needsClassrooms && !needsTimeSlots ? 'bg-violet-600 text-white' : needsClassrooms ? 'bg-slate-300 text-white' : 'bg-emerald-500 text-white'}`}>
                  {needsClassrooms ? (needsTimeSlots ? '2' : '\u2713') : '\u2713'}
                </div>
                <span className={`text-xs font-bold ${needsClassrooms ? 'text-slate-600' : 'text-emerald-700'}`}>Sections</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Create classroom sections in Class Management</p>
              {needsClassrooms ? (
                <p className="text-[11px] text-amber-600 font-semibold">Go to Class Management first</p>
              ) : (
                <p className="text-[11px] text-emerald-600 font-semibold">{classrooms.length} sections available</p>
              )}
            </div>

            {/* Step 3: Start Assigning */}
            <div className={`relative p-4 rounded-xl border-2 transition-all ${isSetupComplete ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${isSetupComplete ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                  {isSetupComplete ? '\u2713' : '3'}
                </div>
                <span className={`text-xs font-bold ${isSetupComplete ? 'text-emerald-700' : 'text-slate-500'}`}>Assign Classes</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Pick a section and assign subjects to time slots</p>
              {isSetupComplete && (
                <p className="text-[11px] text-emerald-600 font-semibold">Ready to schedule!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Conflicts banner ── */}
      {showConflicts && (
        <div className={`rounded-xl p-4 ${conflicts.length > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`font-bold text-sm ${conflicts.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {conflicts.length > 0 ? `${conflicts.length} Conflict(s) Detected` : 'No scheduling conflicts found'}
            </p>
            <button onClick={() => setShowConflicts(false)} className={`text-xs font-bold ${conflicts.length > 0 ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-400 hover:text-emerald-600'}`}>Dismiss</button>
          </div>
          {conflicts.length > 0 && (
            <div className="space-y-1 mt-2">
              {conflicts.map((c, i) => <p key={i} className="text-xs text-rose-600">{c.description}</p>)}
            </div>
          )}
        </div>
      )}

      {/* ── Missing slots warning ── */}
      {timeSlots.length > 0 && uniquePeriods.length > 0 && (() => {
        let missing = 0;
        uniquePeriods.forEach(p => WEEKDAYS.forEach(d => { if (!hasSlotForCell(d, p)) missing++; }));
        return missing > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">{missing} time slot gap(s) detected</p>
              <p className="text-xs text-amber-700 mt-0.5">Some periods exist on certain days but not others.</p>
            </div>
            <button type="button" onClick={fillMissingSlots} disabled={savingSlot}
              className="shrink-0 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50">
              Fill All Gaps
            </button>
          </div>
        ) : null;
      })()}

      {/* ── Main Content: Section Picker or Timetable Grid ── */}
      {!filterClassroom ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Choose a Section</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a classroom section to view or edit its weekly timetable</p>
          </div>
          <div className="p-5">
            {classrooms.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <p className="text-sm font-bold text-slate-600">No sections found</p>
                <p className="text-xs text-slate-400 mt-1">Create classroom sections in Class Management first</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {classrooms.map(c => {
                  const count = classroomScheduleCounts[c.id] || 0;
                  return (
                    <button key={c.id} type="button" onClick={() => setFilterClassroom(String(c.id))}
                      className="text-left p-4 rounded-xl border-2 border-slate-200 hover:border-violet-400 hover:bg-violet-50/50 hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-violet-800">{c.name}</span>
                        {count > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">{count}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {count > 0 ? `${count} class${count === 1 ? '' : 'es'} assigned` : 'Empty — click to start'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : uniquePeriods.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm py-16 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-sm font-bold text-slate-800">No bell periods configured</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Set up your school&apos;s daily schedule first. Click the &quot;Time Slots&quot; button above or use the quick setup.</p>
          <div className="flex justify-center gap-2 mt-4">
            <button type="button" onClick={() => applyStandardBell(false)} disabled={savingSlot}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50">
              Apply Standard Schedule
            </button>
            <button type="button" onClick={() => setShowSlotPanel(true)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50">
              Custom Setup
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Section header with filter controls */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{classrooms.find(c => String(c.id) === filterClassroom)?.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Weekly Timetable</p>
              </div>
              <button type="button" onClick={() => setFilterClassroom('')}
                className="text-[10px] font-bold text-violet-600 hover:text-violet-800 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors">
                Change
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select value={filterDay} onChange={e => setFilterDay(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                <option value="">All Days</option>
                {DAYS.map(d => <option key={d} value={d}>{DAY_FULL[d]}</option>)}
              </select>
              <button type="button" onClick={() => openCreate()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add Class
              </button>
              {filtered.length > 0 && (
                <button type="button" onClick={clearAllSchedules} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 hover:border-rose-300 disabled:opacity-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Mobile: day selector tabs + single day schedule */}
          <div className="md:hidden">
            <div className="overflow-x-auto border-b border-slate-100 px-3 pt-3 pb-0">
              <div className="flex gap-1.5 min-w-max">
                {DAYS.map(d => (
                  <button key={d} type="button" onClick={() => setMobileSelectedDay(d)}
                    className={`px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                      mobileSelectedDay === d
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 active:bg-slate-300'
                    }`}>
                    {DAY_SHORT[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 space-y-2">
              {uniquePeriods.map(period => {
                const entries = getCellSchedules(mobileSelectedDay, period);
                const ready = hasSlotForCell(mobileSelectedDay, period);
                const cellKey = `${mobileSelectedDay}-${period.start_time}-${period.end_time}`;
                const isAdding = addingCell === cellKey;
                const isBreak = isBreakPeriod(period.slot_type, period.label);
                const typeStyle = SLOT_TYPE_MAP[period.slot_type] || SLOT_TYPE_MAP.class;

                if (isBreak) {
                  return (
                    <div key={cellKey} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ border: `1.5px dashed ${typeStyle.barBorder}`, background: typeStyle.barBg }}>
                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: typeStyle.barText }}>{typeStyle.label}</span>
                      <div className="flex-1 h-px" style={{ background: typeStyle.barText, opacity: 0.2 }} />
                      <span className="text-[9px] font-bold text-slate-400">{period.start_display} – {period.end_display}</span>
                    </div>
                  );
                }

                if (entries.length === 0 && !isBreak) {
                  return (
                    <button key={cellKey} type="button" onClick={() => openCreateAtCell(mobileSelectedDay, period)} disabled={isAdding}
                      className={`w-full py-3 px-3 rounded-lg border text-left transition-all ${ready ? 'border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 active:bg-violet-50' : 'border-dashed border-amber-200 bg-amber-50/30 hover:border-amber-400 active:bg-amber-50'}`}>
                      <p className="text-xs font-bold text-slate-700">{period.start_display} – {period.end_display}</p>
                      <p className="text-[10px] mt-0.5 font-semibold text-violet-600">{isAdding ? 'Adding...' : ready ? 'Tap to assign' : 'Tap to enable & assign'}</p>
                    </button>
                  );
                }
                return entries.map(s => (
                  <div key={s.id} className="flex gap-2 items-stretch">
                    <div className="text-[10px] font-bold text-slate-500 w-14 shrink-0 pt-2 leading-tight">{period.start_display}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`p-2.5 rounded-lg border ${subjectColorMap[s.subject] || COLORS[0]} relative shadow-sm`}>
                        <p className="text-[10px] font-bold uppercase tracking-tight leading-none">{s.subject_code}</p>
                        <p className="text-[11px] font-bold leading-tight line-clamp-1">{s.subject_name}</p>
                        {s.teacher_name && <p className="text-[9px] opacity-60 truncate">{s.teacher_name}</p>}
                        <div className="absolute top-1 right-1 flex gap-0.5">
                          <button type="button" onClick={() => openEdit(s)} className="w-6 h-6 rounded-md bg-white/90 flex items-center justify-center hover:bg-white shadow-sm" title="Edit">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button type="button" onClick={() => handleDelete(s.id, `${s.subject_name} — ${s.classroom_name}`)} className="w-6 h-6 rounded-md bg-rose-500 flex items-center justify-center hover:bg-rose-600 shadow-sm" title="Delete">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              })}
            </div>
          </div>

          {/* Desktop grid */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-separate border-spacing-0" style={{ minWidth: 700 }}>
              <thead>
                <tr className="bg-slate-800">
                  <th className="px-3 py-2.5 text-left w-24 border-r border-slate-700">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Period</span>
                  </th>
                  {(filterDay ? [filterDay] : DAYS).map(d => (
                    <th key={d} className="px-2 py-2.5 text-left border-r border-slate-700/50 min-w-[120px]">
                      <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">{DAY_SHORT[d]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniquePeriods.map((period, ri) => {
                  const isBreak = isBreakPeriod(period.slot_type, period.label);
                  const typeStyle = SLOT_TYPE_MAP[period.slot_type] || SLOT_TYPE_MAP.class;
                  const colCount = filterDay ? 1 : DAYS.length;

                  if (isBreak) {
                    return (
                      <tr key={`${period.start_time}-${period.end_time}`}>
                        <td colSpan={colCount + 1} className="px-0 py-0" style={{ borderTop: `2px dashed ${typeStyle.barBorder}`, borderBottom: `2px dashed ${typeStyle.barBorder}`, background: typeStyle.barBg }}>
                          <div className="flex items-center gap-3 px-4 py-2">
                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: typeStyle.barText }}>{typeStyle.label}</span>
                            <div className="flex-1 h-px" style={{ background: typeStyle.barText, opacity: 0.2 }} />
                            <span className="text-[9px] font-bold text-slate-400">{period.start_display} – {period.end_display}</span>
                            {period.label && <span className="text-[8px] font-bold text-slate-400 uppercase">{period.label}</span>}
                            <div className="flex-1 h-px" style={{ background: typeStyle.barText, opacity: 0.2 }} />
                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: typeStyle.barText }}>{typeStyle.label}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                  <tr key={`${period.start_time}-${period.end_time}`} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-3 py-2 border-r border-slate-100 align-top">
                      <p className="text-xs font-bold text-slate-800">{period.start_display}</p>
                      <p className="text-[10px] text-slate-400">{period.end_display}</p>
                      {period.label && <span className="mt-1 inline-block text-[9px] font-bold text-violet-600 uppercase">{period.label}</span>}
                    </td>
                    {(filterDay ? [filterDay] : DAYS).map(d => {
                      const entries = getCellSchedules(d, period);
                      const ready = hasSlotForCell(d, period);
                      const cellKey = `${d}-${period.start_time}-${period.end_time}`;
                      const isAdding = addingCell === cellKey;
                      return (
                        <td key={d} className="px-1.5 py-1.5 align-top border-r border-slate-100 min-h-[72px] group/cell">
                          <div className="space-y-1 min-h-[64px]">
                            {entries.map(s => (
                              <div key={s.id}
                                className={`p-2 rounded-lg border ${subjectColorMap[s.subject] || COLORS[0]} relative group shadow-sm hover:shadow-md transition-all cursor-pointer`}
                                onClick={() => openEdit(s)}>
                                <p className="text-[9px] font-bold uppercase tracking-tight leading-none">{s.subject_code}</p>
                                <p className="text-[10px] font-bold leading-tight line-clamp-1">{s.subject_name}</p>
                                {s.teacher_name && <p className="text-[9px] opacity-60 truncate">{s.teacher_name}</p>}
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(s.id, `${s.subject_name} — ${s.classroom_name}`); }}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded bg-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            ))}
                            {entries.length === 0 && !isBreak && (
                              <button type="button" onClick={() => openCreateAtCell(d, period)} disabled={isAdding}
                                title={ready ? 'Assign class' : 'Enable period & assign'}
                                className={`w-full py-1.5 border border-dashed rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all text-[9px] font-bold uppercase tracking-wide ${
                                  isAdding ? 'opacity-50 cursor-wait border-violet-200 text-violet-400' :
                                  ready ? 'text-slate-300 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/40 opacity-60 hover:opacity-100' :
                                  'border-amber-200 text-amber-600 bg-amber-50/50 hover:border-amber-400 opacity-80 hover:opacity-100'
                                }`}>
                                {isAdding ? '...' : ready ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg> : <span>Enable + Add</span>}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SCHEDULE FORM MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={showForm} onClose={() => setShowForm(false)} size="md"
        title={editItem ? 'Edit Class Schedule' : 'Assign Class to Schedule'}
        subtitle={editItem ? 'Update this schedule entry' : 'Assign a subject to a time slot'}>
        <form id="schedule-form" onSubmit={handleSave} className="flex flex-col">
          <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 overflow-y-auto max-h-[65vh]">
            {/* Section + Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
                  Section / Class <span className="text-red-600">*</span>
                </label>
                <select required value={form.classroom} onChange={e => setForm(f => ({...f, classroom: e.target.value, subject:'', teacher:''}))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500">
                  <option value="">— Select Section —</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
                  Day & Time Slot <span className="text-red-600">*</span>
                </label>
                <select required value={form.time_slot} onChange={e => setForm(f => ({...f, time_slot: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500">
                  <option value="">— Select Time Slot —</option>
                  {DAYS.map(d => {
                    const daySlots = sortedSlots.filter(ts => ts.day === d && !isBreakPeriod(ts.slot_type, ts.label));
                    if (!daySlots.length) return null;
                    return (
                      <optgroup key={d} label={`── ${DAY_FULL[d]} ──`}>
                        {daySlots.map(ts => (
                          <option key={ts.id} value={ts.id}>
                            {ts.start_time_display || normalizeTime(ts.start_time)} – {ts.end_time_display || normalizeTime(ts.end_time)}{ts.label ? ` · ${ts.label}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Vacant toggle */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="is-vacant"
                checked={form.is_vacant || false}
                onChange={e => setForm(f => ({ ...f, is_vacant: e.target.checked, subject: '', teacher: '' }))}
                className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="is-vacant" className="flex-1 cursor-pointer">
                <span className="text-sm font-bold text-slate-700">Mark as Vacant</span>
                <p className="text-[10px] text-slate-500 mt-0.5">No subject or teacher assigned to this slot</p>
              </label>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">Vacant</span>
            </div>

            {/* Subject */}
            {!form.is_vacant && (
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
                Subject <span className="text-red-600">*</span>
              </label>
              {loadingAssignments ? (
                <div className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs text-slate-400 bg-slate-50 flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin text-violet-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Loading subjects...
                </div>
              ) : (
                <>
                  <select required={!form.is_vacant} value={form.subject} onChange={e => {
                    const sid = e.target.value;
                    const match = classroomAssignments.find(a => String(a.subject) === sid);
                    if (match) { setTeacherLocked(true); setForm(f => ({...f, subject: sid, teacher: String(match.teacher)})); }
                    else { setTeacherLocked(false); setForm(f => ({...f, subject: sid})); }
                  }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500">
                    <option value="">{!form.classroom ? '— Select a section first —' : classroomAssignments.length === 0 ? '— No subjects assigned to this section —' : '— Select Subject —'}</option>
                    {(form.classroom && classroomAssignments.length > 0 ? classroomAssignments : []).map(a => (
                      <option key={a.subject} value={a.subject}>{a.subject_code} — {a.subject_name}</option>
                    ))}
                  </select>
                  {form.classroom && classroomAssignments.length === 0 && !loadingAssignments && (
                    <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠ No subjects assigned to this section. Go to Subject Assignment first.</p>
                  )}
                </>
              )}
            </div>
            )}

            {/* Teacher */}
            {!form.is_vacant && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  Teacher <span className="text-red-600">*</span>
                </label>
                {teacherLocked && (
                  <button type="button" onClick={() => setTeacherLocked(false)}
                    className="text-[10px] text-violet-600 font-bold hover:text-violet-800 underline">
                    Override
                  </button>
                )}
              </div>
              <select required={!form.is_vacant} value={form.teacher} onChange={e => setForm(f => ({...f, teacher: e.target.value}))}
                disabled={teacherLocked}
                className={`w-full px-3 py-2.5 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 ${teacherLocked ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-300'}`}>
                <option value="">— Select Teacher —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.first_name && t.last_name ? `${t.last_name}, ${t.first_name}` : t.username}{t.staff_title ? ` (${t.staff_title})` : ''}</option>
                ))}
              </select>
              {teacherLocked && (
                <p className="text-[10px] text-slate-500 mt-1">Auto-filled from subject assignment. Click Override to change.</p>
              )}
            </div>
            )}

            {/* Room */}
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Room (optional)</label>
              <select value={form.room} onChange={e => setForm(f => ({...f, room: e.target.value}))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500">
                <option value="">— No Room Assigned —</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.building ? ` — ${r.building}` : ''} (Cap: {r.capacity})</option>)}
              </select>
            </div>

            {/* Academic Year + Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
                  Academic Year <span className="text-red-600">*</span>
                </label>
                <select required value={form.academic_year} onChange={e => setForm(f => ({...f, academic_year: e.target.value, semester:''}))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500">
                  <option value="">— Select Year —</option>
                  {academicYears.map(a => <option key={a.id} value={a.id}>{a.name}{a.is_active ? ' (Active)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Semester (optional)</label>
                <select value={form.semester} onChange={e => setForm(f => ({...f, semester: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500">
                  <option value="">None</option>
                  {semesters.map(s => <option key={s.id} value={s.id}>{s.semester_type}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                rows={2} placeholder="Additional notes..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 resize-none placeholder:text-slate-400" />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 md:px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-6 py-2.5 bg-white text-slate-700 text-xs font-black uppercase tracking-widest border border-slate-300 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-8 py-2.5 bg-violet-600 text-white text-xs font-black uppercase tracking-widest hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2 rounded-lg">
              {saving && <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Assign Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          BELL PERIODS MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <BellPeriodModal
        open={showSlotPanel}
        onClose={() => { setShowSlotPanel(false); cancelEditSlot(); }}
        sectionName={filterClassroom ? classrooms.find(c => String(c.id) === filterClassroom)?.name : null}
        uniquePeriods={uniquePeriods}
        sortedSlots={sortedSlots}
        timeSlots={timeSlots}
        filterClassroom={filterClassroom}
        slotForm={slotForm}
        setSlotForm={setSlotForm}
        savingSlot={savingSlot}
        editingSlot={editingSlot}
        editSlotForm={editSlotForm}
        setEditSlotForm={setEditSlotForm}
        startEditSlot={startEditSlot}
        cancelEditSlot={cancelEditSlot}
        saveEditSlot={saveEditSlot}
        deleteSlot={deleteSlot}
        applyStandardBell={applyStandardBell}
        fillMissingSlots={fillMissingSlots}
        clearAllTimeSlots={clearAllTimeSlots}
        applyToAllDays={applyToAllDays}
        saveSlotBulk={saveSlotBulk}
        showTutorial={showTutorial}
        setShowTutorial={setShowTutorial}
        tutorialStep={tutorialStep}
        setTutorialStep={setTutorialStep}
        tutorialSteps={tutorialSteps}
        dismissTutorial={dismissTutorial}
        nextTutorial={nextTutorial}
        prevTutorial={prevTutorial}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          ROOMS MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={showRoomPanel} onClose={() => setShowRoomPanel(false)} size="lg"
        title="Rooms" subtitle={`${rooms.length} registered`}>
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0 max-h-[75vh]">
          <div className="w-full md:w-[320px] p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 overflow-y-auto shrink-0">
            <form onSubmit={saveRoom} className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Add Room</p>
              <Field label="Room Name" required>
                <input required value={roomForm.name} onChange={e => setRoomForm(f => ({...f, name: e.target.value}))}
                  placeholder="e.g. Room 204"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
              </Field>
              <Field label="Building">
                <input value={roomForm.building} onChange={e => setRoomForm(f => ({...f, building: e.target.value}))}
                  placeholder="e.g. Main Bldg"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
              </Field>
              <Field label="Type">
                <Select value={roomForm.room_type} onChange={e => setRoomForm(f => ({...f, room_type: e.target.value}))}>
                  <option value="classroom">Classroom</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="gym">Gymnasium</option>
                  <option value="library">Library</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Capacity">
                <input type="number" min={1} value={roomForm.capacity} onChange={e => setRoomForm(f => ({...f, capacity: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
              </Field>
              <button type="submit" disabled={savingRoom}
                className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-all">
                {savingRoom ? 'Adding...' : '+ Add Room'}
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-white">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Registered Rooms</p>
            {rooms.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-xs font-bold">No rooms registered yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rooms.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 hover:bg-violet-50 transition-all group border border-transparent hover:border-violet-100">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{r.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold uppercase text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-md">{r.room_type}</span>
                        {r.building && <span className="text-[10px] text-slate-400 font-medium">{r.building}</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Capacity: {r.capacity}</p>
                    </div>
                    <button onClick={() => deleteRoom(r.id, r.name)}
                      className="p-2 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-100 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      </div>
    </div>
  );
}
