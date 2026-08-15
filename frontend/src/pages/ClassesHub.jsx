import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParallelFetch } from '../hooks/useFetch';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Skeleton, Button } from '../components/ui';
import { administration, faculty, getInitials } from '../data/facultyData';

// -- Build a lookup: last name ? photo from facultyData ----------------------
const FACULTY_PHOTO_MAP = (() => {
  const map = {};
  [...administration, ...faculty].forEach(p => {
    if (p.photo) {
      const parts = p.name.split(' ');
      const lastName = parts[parts.length - 1].replace(/[.,]$/, '').toLowerCase();
      map[lastName] = p.photo;
      map[p.name.toLowerCase()] = p.photo;
    }
  });
  return map;
})();

function resolveAdviserPhoto(name, profilePicture) {
  if (profilePicture) return profilePicture;
  if (!name) return null;
  const lastName = name.trim().split(' ').pop().toLowerCase();
  if (FACULTY_PHOTO_MAP[lastName]) return FACULTY_PHOTO_MAP[lastName];
  if (FACULTY_PHOTO_MAP[name.toLowerCase()]) return FACULTY_PHOTO_MAP[name.toLowerCase()];
  return null;
}

function AdviserAvatar({ name, photo }) {
  const [imgError, setImgError] = useState(false);
  const src = resolveAdviserPhoto(name, photo);
  const showPhoto = src && !imgError;
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');

  return (
    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm bg-violet-100 flex items-center justify-center">
      {showPhoto ? (
        <img src={src} alt={name} className="w-full h-full object-cover object-top" onError={() => setImgError(true)} />
      ) : (
        <span className="text-[8px] font-black text-violet-600 select-none">{initials}</span>
      )}
    </div>
  );
}

const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat' };

function ScheduleGrid({ schedules }) {
  const timeSlots = useMemo(() => {
    const seen = new Set();
    return schedules
      .map(s => s.time_slot_detail)
      .filter(ts => {
        if (!ts || seen.has(ts.start_time + ts.end_time)) return false;
        seen.add(ts.start_time + ts.end_time);
        return true;
      })
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [schedules]);

  const scheduleMap = useMemo(() => {
    const map = {};
    schedules.forEach(s => {
      const day = s.time_slot_detail?.day;
      const key = `${day}_${s.time_slot_detail?.start_time}_${s.time_slot_detail?.end_time}`;
      map[key] = s;
    });
    return map;
  }, [schedules]);

  if (timeSlots.length === 0) return null;

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left font-bold text-slate-600 whitespace-nowrap w-28">Time</th>
              {DAYS.map(d => (
                <th key={d} className="px-3 py-2 text-center font-bold text-slate-600 whitespace-nowrap">{DAY_LABELS[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {timeSlots.map((ts, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-3 py-2 text-slate-500 font-semibold whitespace-nowrap">
                  <div>{ts.start_time_display}</div>
                  <div className="text-[9px] text-slate-400">� {ts.end_time_display}</div>
                </td>
                {DAYS.map(d => {
                  const key = `${d}_${ts.start_time}_${ts.end_time}`;
                  const sched = scheduleMap[key];
                  return (
                    <td key={d} className="px-2 py-1.5 text-center">
                      {sched ? (
                        <div className="bg-violet-50 border border-violet-200 rounded px-2 py-1.5">
                          <div className="font-bold text-violet-800 truncate">{sched.subject_code}</div>
                          <div className="text-[9px] text-violet-600 truncate">{sched.teacher_name}</div>
                          {sched.room_name && <div className="text-[9px] text-slate-400 truncate">{sched.room_name}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-300">�</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ClassesHub() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useParallelFetch({
    classes: '/classrooms/',
    teachers: '/users/?role=staff',
    academicYears: '/admin/academic-years/',
  });
  const classes = useMemo(() => Array.isArray(data.classes) ? data.classes : [], [data.classes]);
  const teachers = useMemo(() => Array.isArray(data.teachers) ? data.teachers : [], [data.teachers]);
  const academicYears = useMemo(() => Array.isArray(data.academicYears) ? data.academicYears : [], [data.academicYears]);

  const [selectedYearId, setSelectedYearId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [formData, setFormData] = useState({ name: '', teacher: '', grade_level: '' });
  const [sectionSubjects, setSectionSubjects] = useState({});
  const [sectionSchedules, setSectionSchedules] = useState({});
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const activeYear = academicYears.find(y => y.is_active) || academicYears[0];
  useEffect(() => {
    if (activeYear && !selectedYearId) setSelectedYearId(activeYear.id);
  }, [activeYear, selectedYearId]);

  useEffect(() => {
    if (!selectedYearId) return;
    api.get(`/classrooms/?academic_year=${encodeURIComponent(selectedYearId)}`).then(() => refetch()).catch(() => {});
  }, [selectedYearId]);

  useEffect(() => {
    if (!classes.length) return;
    const load = async () => {
      setSubjectsLoading(true);
      const results = {};
      await Promise.all(classes.map(async (cls) => {
        try {
          const res = await api.get(`/classroom-subjects/by_classroom/?classroom_id=${cls.id}`);
          results[cls.id] = res.data;
        } catch { results[cls.id] = []; }
      }));
      setSectionSubjects(results);
      setSubjectsLoading(false);
    };
    load();
  }, [classes]);

  useEffect(() => {
    if (!classes.length || !selectedYearId) return;
    const load = async () => {
      const results = {};
      await Promise.all(classes.map(async (cls) => {
        try {
          const res = await api.get(`/schedules/?classroom=${cls.id}&academic_year=${selectedYearId}`);
          results[cls.id] = Array.isArray(res.data) ? res.data : res.data?.results || [];
        } catch { results[cls.id] = []; }
      }));
      setSectionSchedules(results);
    };
    load();
  }, [classes, selectedYearId]);

  const filteredClasses = useMemo(() => {
    let filtered = classes;
    if (search) { const q = search.toLowerCase(); filtered = filtered.filter(c => c.name.toLowerCase().includes(q)); }
    if (filterLevel) { filtered = filtered.filter(c => String(c.grade_level) === String(filterLevel)); }
    return filtered;
  }, [classes, search, filterLevel]);

  const groupedClasses = useMemo(() => {
    const groups = {};
    filteredClasses.forEach(c => { const grade = c.grade_level || 'Unassigned'; if (!groups[grade]) groups[grade] = []; groups[grade].push(c); });
    return groups;
  }, [filteredClasses]);

  const sortedGrades = useMemo(() => {
    const order = GRADE_LEVELS;
    return Object.keys(groupedClasses).sort((a, b) => {
      const iA = order.indexOf(a); const iB = order.indexOf(b);
      if (iA === -1 && iB === -1) return a.localeCompare(b);
      if (iA === -1) return 1; if (iB === -1) return -1;
      return iA - iB;
    });
  }, [groupedClasses]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Section name is required');
    if (!formData.grade_level) return toast.error('Grade level is required');
    setSaving(true);
    try {
      const payload = { name: formData.name.trim(), grade_level: formData.grade_level, teacher: formData.teacher || null }; if (selectedYearId) payload.academic_year = selectedYearId; await api.post('/classrooms/', payload);
      toast.success('Section created');
      setShowModal(false);
      setFormData({ name: '', grade_level: '', teacher: '' });
      refetch();
    } catch (err) { toast.error(err.response?.data?.detail || err.response?.data?.error || `${err.response?.status}: ${err.response?.statusText}` || 'Failed to create section'); console.error('createClass error', err.response?.data, err); }
    finally { setSaving(false); }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Section name is required');
    setSaving(true);
    try {
      await api.patch(`/classrooms/${editingClass.id}/`, { name: formData.name.trim(), grade_level: formData.grade_level, teacher: formData.teacher || null });
      toast.success('Section updated');
      setShowModal(false);
      setEditingClass(null);
      setFormData({ name: '', grade_level: '', teacher: '' });
      refetch();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update section'); }
    finally { setSaving(false); }
  };

  const handleDeleteClass = async (id) => {
    const result = await Swal.fire({ title: 'Delete Section?', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, delete it!' });
    if (result.isConfirmed) {
      try { await api.delete(`/classrooms/${id}/`); toast.success('Section deleted'); refetch(); } catch { toast.error('Failed to delete section'); }
    }
  };

  if (loading) return (
    <div className="page-bottom-safe bg-slate-50 min-h-screen px-4 md:px-6 py-6 space-y-5">
      <Skeleton.PageHeader />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton.StatCard key={i} />)}
      </div>
      <Skeleton.CardGrid count={6} cols={3} />
    </div>
  );

  return (
    <div className="page-bottom-safe bg-slate-50 min-h-screen">

      {/* -- Header with live stats -- */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#5e2a84] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Classes Hub</h1>
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Classroom sections & subject assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <span className="text-lg font-black text-slate-800">{classes.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sections</span>
            </div>
            <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5">
              <span className="text-sm font-black text-violet-700">{sortedGrades.length}</span>
              <span className="text-[10px] font-bold text-violet-500 uppercase">Grade Levels</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <span className="text-sm font-black text-emerald-700">{classes.reduce((sum, c) => sum + (c.student_count ?? 0), 0)}</span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Students</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4 space-y-4">
        {/* -- Toolbar -- */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={selectedYearId} onChange={e => setSelectedYearId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name} {y.is_active && '(Active)'}</option>)}
          </select>
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
            <option value="">All Grades</option>
            {GRADE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sections�"
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => navigate('/subjects')}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 font-bold py-2 px-3 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253" /></svg>
              Subjects
            </button>
            <button onClick={() => { setFormData({ name: '', grade_level: '', teacher: '' }); setEditingClass(null); setShowModal(true); }}
              aria-label="Add new section"
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Section
            </button>
          </div>
        </div>
        {sortedGrades.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Sections Found</h3>
            <p className="text-slate-500">Click "Add Section" to create your first section.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedGrades.map(grade => (
              <div key={grade} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#5e2a84] flex items-center justify-center rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <h3 className="font-bold text-slate-700">{grade}</h3>
                  </div>
                  <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{groupedClasses[grade].length} sections</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {groupedClasses[grade].map(cls => {
                    const subs = sectionSubjects[cls.id] || [];
                    return (
                      <div key={cls.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                              {cls.name.match(/\d+/)?.[0] || cls.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 truncate">{cls.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                {cls.teacher_name ? (
                                  <div className="flex items-center gap-1.5">
                                    {/* Adviser mini photo */}
                                    <AdviserAvatar
                                      name={cls.teacher_name}
                                      photo={(() => {
                                        const t = teachers.find(t => t.id === cls.teacher);
                                        return t?.profile?.profile_picture || null;
                                      })()}
                                    />
                                    <span className="text-xs text-slate-500">
                                      {cls.teacher_name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">No adviser</span>
                                )}
                                <span className="text-slate-300 text-xs">�</span>
                                <span className="text-xs text-slate-500">{cls.student_count ?? 0} students</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(sectionSchedules[cls.id] || []).length > 0 && (
                              <Button
                                variant={expandedSchedule === cls.id ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setExpandedSchedule(expandedSchedule === cls.id ? null : cls.id)}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Schedule
                              </Button>
                            )}
                            <Button variant="secondary" size="sm" onClick={() => { setEditingClass(cls); setFormData({ name: cls.name, grade_level: cls.grade_level, teacher: cls.teacher || '' }); setShowModal(true); }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Edit
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteClass(cls.id)}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Delete
                            </Button>
                          </div>
                        </div>
                        {subjectsLoading ? (
                          <div className="mt-3 ml-14 flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                            <span className="text-xs text-slate-400 font-medium">Loading subjects...</span>
                          </div>
                        ) : subs.length > 0 ? (
                          <div className="mt-3 ml-14 flex flex-wrap gap-1.5">
                            {subs.map(s => (
                              <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                                <span className="font-mono">{s.subject_code}</span>
                                <span className="text-violet-300">·</span>
                                <span>{s.teacher_name}</span>
                              </span>
                            ))}
                            <button onClick={() => navigate('/subjects?tab=assignments')} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                              + Manage
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 ml-14">
                            <button onClick={() => navigate('/subjects?tab=assignments')} className="text-xs font-semibold text-slate-400 hover:text-violet-600 transition-colors">
                              + Assign subjects
                            </button>
                          </div>
                        )}
                        {subs.length === 0 && (
                          <div className="mt-3 ml-14">
                            <button onClick={() => navigate('/subjects?tab=assignments')} className="text-xs font-semibold text-slate-400 hover:text-violet-600 transition-colors">
                              + Assign subjects
                            </button>
                          </div>
                        )}
                        {(sectionSchedules[cls.id] || []).length > 0 && (
                          <div className="mt-3 ml-14">
                            <button
                              onClick={() => setExpandedSchedule(expandedSchedule === cls.id ? null : cls.id)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600 transition-colors"
                            >
                              <svg className={`w-3.5 h-3.5 transition-transform ${expandedSchedule === cls.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              {expandedSchedule === cls.id ? 'Hide' : 'View'} Schedule ({sectionSchedules[cls.id].length} periods)
                            </button>
                          </div>
                        )}
                        {expandedSchedule === cls.id && (sectionSchedules[cls.id] || []).length > 0 && (
                          <div className="mt-3 ml-14 overflow-x-auto">
                            <ScheduleGrid schedules={sectionSchedules[cls.id]} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)} role="dialog" aria-modal="true" aria-label={editingClass ? 'Edit Section' : 'New Section'}>
          <div className="bg-white w-full max-w-lg border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">{editingClass ? 'Edit Section' : 'New Section'}</h2>
                  <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">Classroom Management</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} aria-label="Close dialog"
                className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={editingClass ? handleUpdateClass : handleCreateClass}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label htmlFor="section-name" className="block text-xs font-bold text-slate-700 mb-1">Section Name <span className="text-red-500" aria-hidden="true">*</span></label>
                  <input id="section-name" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Grade 7 - St. Michael" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500" required aria-required="true" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Grade Level <span className="text-red-500">*</span></label>
                    <select value={formData.grade_level} onChange={e => setFormData({ ...formData, grade_level: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500" required>
                      <option value="">-- Select --</option>
                      {GRADE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Adviser</label>
                    <select value={formData.teacher} onChange={e => setFormData({ ...formData, teacher: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500">
                      <option value="">-- None --</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 sm:px-6 py-2.5 bg-white text-gray-700 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-100 rounded-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 sm:px-6 py-2.5 bg-[#5e2a84] text-white text-xs font-black uppercase tracking-widest hover:bg-violet-700 rounded-sm disabled:opacity-50">
                  {saving ? 'Saving...' : editingClass ? 'Save Changes' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
