import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useActiveAcademicYear } from '../../hooks/useActiveAcademicYear';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Button } from '../../components/ui';
import { Field, Input, Toggle, Skeleton } from './shared';

const AcademicYearsTab = () => {
  const { setAcademicYear } = useActiveAcademicYear();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_active: false });
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  const fetchYears = async () => {
    try {
      const r = await api.get('/admin/academic-years/');
      const list = Array.isArray(r.data) ? r.data : r.data?.results || [];
      setYears([...list].sort((a, b) => b.name.localeCompare(a.name)));
    } catch { toast.error('Failed to load academic years'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchYears(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openCreate = () => {
    setEditingYear(null);
    setForm({ name: '', start_date: '', end_date: '', is_active: false });
    setShowForm(true);
  };

  const openEdit = (y) => {
    setEditingYear(y);
    setForm({ name: y.name, start_date: y.start_date, end_date: y.end_date, is_active: y.is_active });
    setShowForm(true);
    setOpenMenuId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.start_date || !form.end_date) return toast.error('All fields are required');
    setSaving(true);
    try {
      if (editingYear) {
        await api.patch(`/admin/academic-years/${editingYear.id}/`, form);
        toast.success('Academic year updated');
      } else {
        await api.post('/admin/academic-years/', form);
        toast.success('Academic year created');
      }
      setShowForm(false);
      fetchYears();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleSetActive = async (y) => {
    try {
      await api.post(`/admin/academic-years/${y.id}/activate/`);
      setAcademicYear(y.name);
      toast.success(`${y.name} set as active year`);
      fetchYears();
    } catch { toast.error('Failed to set active year'); }
    setOpenMenuId(null);
  };

  const handleDelete = async (y) => {
    setOpenMenuId(null);
    const result = await Swal.fire({
      title: `Delete ${y.name}?`,
      text: 'This will unlink all classrooms from this year. This cannot be undone.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/admin/academic-years/${y.id}/`);
      toast.success('Academic year deleted');
      fetchYears();
    } catch (err) { toast.error(err?.response?.data?.detail || err?.response?.data?.error || 'Failed to delete academic year'); }
  };

  const getStatus = (y) => {
    if (y.is_archived) return { label: 'Archived', color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' };
    if (y.is_active) return { label: 'Active', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
    const now = new Date();
    const end = new Date(y.end_date);
    if (end < now) return { label: 'Ended', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
    return { label: 'Upcoming', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' };
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Academic Years</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Manage school years for classrooms and data filtering</p>
        </div>
        <Button onClick={openCreate} variant="primary" size="sm">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Add Year
        </Button>
      </div>

      {years.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg text-center py-12">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-bold text-slate-700">No academic years yet</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Create one to start assigning classrooms.</p>
          <Button onClick={openCreate} variant="primary" size="sm">Create First Year</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {years.map(y => {
            const status = getStatus(y);
            return (
              <div key={y.id} className={`bg-white border rounded-lg p-5 transition-all hover:shadow-md ${y.is_active ? 'border-violet-300 ring-1 ring-violet-100' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className={`text-base font-extrabold ${y.is_active ? 'text-violet-900' : 'text-slate-900'}`}>
                        {y.name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.color} mr-1.5`} aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Start</p>
                        <p className="font-semibold text-slate-700">{y.start_date}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">End</p>
                        <p className="font-semibold text-slate-700">{y.end_date}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Classes</p>
                        <p className="font-semibold text-slate-700">—</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Students</p>
                        <p className="font-semibold text-slate-700">—</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Teachers</p>
                        <p className="font-semibold text-slate-700">—</p>
                      </div>
                    </div>
                  </div>

                  {/* Context menu */}
                  <div className="relative flex-shrink-0" ref={menuRef}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === y.id ? null : y.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                      aria-label={`Actions for ${y.name}`}
                      aria-expanded={openMenuId === y.id}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                      </svg>
                    </button>
                    {openMenuId === y.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1" role="menu">
                        {!y.is_active && (
                          <button onClick={() => handleSetActive(y)} role="menuitem"
                            className="w-full text-left px-4 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50 transition-colors flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Set Active
                          </button>
                        )}
                        <button onClick={() => openEdit(y)} role="menuitem"
                          className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(y)} role="menuitem"
                          className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" role="dialog" aria-modal="true" aria-label={editingYear ? 'Edit academic year' : 'New academic year'}>
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">{editingYear ? 'Edit Academic Year' : 'New Academic Year'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all" aria-label="Close">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-3 sm:p-6 space-y-4">
              <Field label="Year Name *" hint='e.g. "2026-2027"'>
                <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="2026-2027" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date *">
                  <Input type="date" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))} required />
                </Field>
                <Field label="End Date *">
                  <Input type="date" value={form.end_date} onChange={e => setForm(p => ({...p, end_date: e.target.value}))} required />
                </Field>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-700">Set as Active Year</span>
                <Toggle checked={form.is_active} onChange={e => setForm(p => ({...p, is_active: e.target.checked}))} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={saving} loading={saving} variant="primary" className="flex-1">
                  {editingYear ? 'Update' : 'Create'}
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="secondary" className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicYearsTab;
