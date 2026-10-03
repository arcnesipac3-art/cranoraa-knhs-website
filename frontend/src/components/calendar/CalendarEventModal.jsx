import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CATEGORY_OPTIONS = [
  { value: 'general',      label: 'General' },
  { value: 'academic',     label: 'Academics' },
  { value: 'events',       label: 'School Events' },
  { value: 'examinations', label: 'Examinations' },
  { value: 'guidance',     label: 'Guidance' },
  { value: 'sports',       label: 'Sports' },
  { value: 'emergency',    label: 'Emergency' },
  { value: 'holiday',      label: 'Holiday' },
];

const PRIORITY_OPTIONS = [
  { value: 'info',      label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'critical',  label: 'Urgent' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all',      label: 'All Users' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Faculty' },
  { value: 'parents',  label: 'Parents' },
];

const CalendarEventModal = ({ open, onClose, event, onSaved }) => {
  const [form, setForm] = useState({
    title: '', content: '', category: 'academic', priority: 'info',
    target_audience: 'all', target_classrooms: [],
    event_date: '', end_date: '', is_pinned: false, is_public: false, status: 'live',
  });
  const [classrooms, setClassrooms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const isEditing = event && event.id;

  useEffect(() => {
    if (open) {
      api.get('/classrooms/').then(r => setClassrooms(r.data)).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (event && open) {
      const dateStr = event.date ? new Date(event.date).toISOString().slice(0, 16) : '';
      const endStr = event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '';
      setForm({
        title: event.title || '',
        content: event.description || event.content || '',
        category: event.category || 'academic',
        priority: event.priority || 'info',
        target_audience: event.target_audience || 'all',
        target_classrooms: event.target_classrooms || [],
        event_date: dateStr,
        end_date: endStr,
        is_pinned: event.is_pinned || false,
        is_public: event.is_public || false,
        status: event.status || 'live',
      });
    } else if (open) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setForm({
        title: '', content: '', category: 'academic', priority: 'info',
        target_audience: 'all', target_classrooms: [],
        event_date: now.toISOString().slice(0, 16),
        end_date: '', is_pinned: false, is_public: false, status: 'live',
      });
    }
    setAttachments([]);
  }, [event, open]);

  const toggleClassroom = (id) => {
    setForm(f => {
      const current = f.target_classrooms || [];
      return { ...f, target_classrooms: current.includes(id) ? current.filter(x => x !== id) : [...current, id] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.event_date) return toast.error('Event date is required');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'target_classrooms') {
          if (v?.length) v.forEach(id => fd.append('target_classrooms', id));
        } else if (k === 'event_date' || k === 'end_date') {
          if (v) fd.append(k, v);
        } else if (typeof v === 'boolean') {
          fd.append(k, v ? 'true' : 'false');
        } else if (v !== null && v !== undefined) {
          fd.append(k, v);
        }
      });
      attachments.forEach(file => fd.append('attachments', file));

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const annId = isEditing ? event.id?.replace('ann-', '') : null;

      if (annId) {
        await api.patch(`/announcements/${annId}/`, fd, config);
        toast.success('Event updated');
      } else {
        await api.post('/announcements/', fd, config);
        toast.success('Event created');
      }
      onSaved();
    } catch (err) {
      const msg = err.response?.data ? Object.entries(err.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ') : 'Failed to save';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 flex items-center justify-between px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-[0.1em]">{isEditing ? 'Edit Event' : 'New Event'}</h2>
              <p className="text-violet-200 text-[10px] mt-1 font-medium tracking-wide">Add to school calendar</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:bg-white/20 hover:text-white transition-all" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-none">
          <div className="p-5 space-y-5">
            {/* Title */}
            <div>
              <label className="text-xs font-bold text-slate-600 tracking-wider mb-1.5 block">Event Title</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Midterm Examinations" required maxLength={150}
                className="w-full text-base font-semibold text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white" />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-slate-600 tracking-wider mb-1.5 block">Description</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Event details..." rows={3}
                className="w-full text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none transition-all bg-white" />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 tracking-wider mb-1.5 block">Start Date & Time</label>
                <input type="datetime-local" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                  required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 tracking-wider mb-1.5 block">End Date & Time</label>
                <input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
                <p className="text-[10px] text-slate-400 mt-1">Optional</p>
              </div>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 tracking-wider mb-1.5 block">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400">
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 tracking-wider mb-1.5 block">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400">
                  {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Audience */}
            <div>
              <label className="text-xs font-bold text-slate-600 tracking-wider mb-2 block">Target Audience</label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, target_audience: opt.value }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                      form.target_audience === opt.value
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {classrooms.length > 0 && form.target_audience !== 'all' && (
                <div className="mt-3">
                  <p className="text-[11px] text-slate-400 mb-1.5 font-medium">Specific Sections (optional)</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {classrooms.map(cls => (
                      <button key={cls.id} type="button" onClick={() => toggleClassroom(cls.id)}
                        className={`px-2 py-1 text-[10px] font-bold border rounded-lg transition-colors ${
                          (form.target_classrooms || []).includes(cls.id)
                            ? 'bg-violet-100 text-violet-800 border-violet-300'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}>
                        {cls.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div>
              <label className="text-xs font-bold text-slate-600 tracking-wider mb-1.5 block">Attachments</label>
              <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden" id="cal-attach"
                onChange={e => { setAttachments(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = ''; }} />
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[120px]">{f.name}</span>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        className="text-slate-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              )}
              <label htmlFor="cal-attach" className="flex items-center justify-center gap-2 py-3 border border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-700 transition-colors rounded-xl cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Attach files
              </label>
            </div>

            {/* Options */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                Pin to top
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                Show on public website
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 bg-white text-slate-700 text-xs font-bold tracking-[0.1em] border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-[2] py-2.5 bg-violet-600 text-white text-xs font-bold tracking-[0.1em] hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2 rounded-xl transition-colors shadow-sm">
              {saving ? <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                : isEditing ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarEventModal;
