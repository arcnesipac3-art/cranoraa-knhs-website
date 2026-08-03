import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useParallelFetch } from '../hooks/useFetch';
import { Skeleton, EmptyState, Button, Badge } from '../components/ui';
import { SearchInput, Select, Textarea } from '../components/ui/Input';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../components/ui/Modal';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const EMPTY_SUBJECT = { name: '', code: '', description: '', grade_level: '' };

function SubjectsTab() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useParallelFetch({
    subjects: '/subjects/',
  });
  const subjects = useMemo(() => Array.isArray(data.subjects) ? data.subjects : [], [data.subjects]);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_SUBJECT);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openCreate = () => { setEditing(null); setForm(EMPTY_SUBJECT); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, code: s.code, description: s.description || '', grade_level: s.grade_level }); setShowModal(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/subjects/${deleteTarget.id}/`); toast.success('Subject deleted'); refetch(); } catch { toast.error('Failed to delete subject'); }
    setDeleteTarget(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Subject name is required');
    if (!form.code.trim()) return toast.error('Subject code is required');
    if (!form.grade_level) return toast.error('Grade level is required');
    setSaving(true);
    try {
      if (editing) { await api.patch(`/subjects/${editing.id}/`, form); toast.success('Subject updated'); }
      else { await api.post('/subjects/', form); toast.success('Subject created'); }
      setShowModal(false); refetch();
    } catch (err) {
      toast.error(err.response?.data?.code?.[0] || err.response?.data?.detail || 'Failed to save subject');
    } finally { setSaving(false); }
  };

  const gradeLevels = useMemo(() => [...new Set(subjects.map(s => s.grade_level))].sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 999) - (parseInt(b.replace(/\D/g, '')) || 999)), [subjects]);

  const filtered = useMemo(() => subjects.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)) && (!filterLevel || s.grade_level === filterLevel);
  }), [subjects, search, filterLevel]);

  const grouped = useMemo(() => filtered.reduce((acc, s) => { const key = s.grade_level || 'Unassigned'; if (!acc[key]) acc[key] = []; acc[key].push(s); return acc; }, {}), [filtered]);

  if (loading) return (
    <div className="space-y-5 px-4 md:px-6 py-6">
      <Skeleton.PageHeader />
      <Skeleton.CardGrid count={6} cols={3} />
    </div>
  );

  return (
    <div className="page-bottom-safe bg-slate-50/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Subjects</h1>
          <p className="text-xs text-slate-500 mt-1">{subjects.length} subjects in the curriculum</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/classes')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            View Sections
          </button>
          <Button variant="primary" onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add Subject
          </Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} containerClassName="sm:w-52">
            <option value="">All Grade Levels</option>
            {gradeLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12">
          <EmptyState icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253" /></svg>} title="No Subjects Found" message={search || filterLevel ? 'Try adjusting your filters' : 'Add your first subject to get started'} />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => (parseInt(a.replace(/\D/g, '')) || 999) - (parseInt(b.replace(/\D/g, '')) || 999)).map(([level, items]) => (
            <div key={level} className="bg-white border border-slate-200 rounded-xl border-l-4 border-l-violet-500 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-violet-100 flex items-center justify-center font-extrabold text-sm text-violet-700 border border-violet-200">{parseInt(level.replace(/\D/g, '')) || level.charAt(0)}</div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{level}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{items.length} Subjects</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider w-32">Code</th>
                      <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Subject Name</th>
                      <th className="hidden md:table-cell px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3"><Badge variant="blue" className="font-mono">{s.code}</Badge></td>
                        <td className="px-4 py-3"><span className="text-sm font-bold text-slate-900">{s.name}</span></td>
                        <td className="hidden md:table-cell px-4 py-3 text-sm text-slate-600 max-w-xs"><span className="line-clamp-1">{s.description || <span className="italic text-slate-400">No description</span>}</span></td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                            <Button variant="danger" size="sm" onClick={() => setDeleteTarget(s)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500 font-semibold text-center">{filtered.length} entries · {Object.keys(grouped).length} grade levels</p>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
        <ModalHeader onClose={() => setShowModal(false)}>
          <ModalTitle title={editing ? 'Edit Subject' : 'New Subject'} subtitle="Subject Management" />
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Subject Code <span className="text-red-500">*</span></label>
                  <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. MATH7" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500" required />
                </div>
                <Select label="Grade Level" required value={form.grade_level} onChange={e => setForm({ ...form, grade_level: e.target.value })}>
                  <option value="">— Select —</option>
                  {GRADE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Subject Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500" required />
              </div>
              <Textarea label="Description" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief subject overview (optional)" />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editing ? 'Save Changes' : 'Create Subject'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Subject?"
        message={`"${deleteTarget?.name}" will be permanently removed from the curriculum. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function AssignmentsTab() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useParallelFetch({
    assignments: '/classroom-subjects/',
    classrooms: '/classrooms/',
    subjects: '/subjects/',
    teachers: '/users/?role=staff',
  });
  const assignments = useMemo(() => data.assignments?.results || data.assignments || [], [data.assignments]);
  const classrooms = useMemo(() => data.classrooms?.results || data.classrooms || [], [data.classrooms]);
  const subjects = useMemo(() => Array.isArray(data.subjects) ? data.subjects : [], [data.subjects]);
  const teachers = useMemo(() => Array.isArray(data.teachers) ? data.teachers : [], [data.teachers]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterClassroom, setFilterClassroom] = useState('');
  const [form, setForm] = useState({ classroom: '', subject: '', teacher: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openCreate = () => { setEditing(null); setForm({ classroom: '', subject: '', teacher: '' }); setShowModal(true); };
  const openEdit = (a) => { setEditing(a); setForm({ classroom: a.classroom, subject: a.subject, teacher: a.teacher }); setShowModal(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/classroom-subjects/${deleteTarget.id}/`); toast.success('Assignment removed'); refetch(); } catch { toast.error('Failed to remove assignment'); }
    setDeleteTarget(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.classroom) return toast.error('Section is required');
    if (!form.subject) return toast.error('Subject is required');
    if (!form.teacher) return toast.error('Teacher is required');
    setSaving(true);
    const payload = { classroom: parseInt(form.classroom), subject: parseInt(form.subject), teacher: parseInt(form.teacher) };
    try {
      if (editing) { await api.patch(`/classroom-subjects/${editing.id}/`, payload); toast.success('Assignment updated'); }
      else { await api.post('/classroom-subjects/', payload); toast.success('Assignment created'); }
      setShowModal(false); refetch();
    } catch (err) {
      const d = err.response?.data;
      // unique_together violation
      const nonFieldErrors = d?.non_field_errors || d?.detail;
      if (nonFieldErrors) {
        const msg = Array.isArray(nonFieldErrors) ? nonFieldErrors[0] : nonFieldErrors;
        if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('already')) {
          toast.error('This subject is already assigned to this section.');
        } else {
          toast.error(msg);
        }
      } else {
        const msg = Object.values(d || {})[0];
        toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to save assignment');
      }
    } finally { setSaving(false); }
  };

  // Group classrooms by grade level
  const groupedClassrooms = useMemo(() => {
    const groups = {};
    classrooms.forEach(c => {
      const key = c.grade_level || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const na = parseInt(a.replace(/\D/g, '')) || 999;
      const nb = parseInt(b.replace(/\D/g, '')) || 999;
      return na - nb;
    });
  }, [classrooms]);

  // Group subjects by grade level
  const groupedSubjects = useMemo(() => {
    const groups = {};
    subjects.forEach(s => {
      const key = s.grade_level || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const na = parseInt(a.replace(/\D/g, '')) || 999;
      const nb = parseInt(b.replace(/\D/g, '')) || 999;
      return na - nb;
    });
  }, [subjects]);

  // Teachers sorted by name
  const sortedTeachers = useMemo(() =>
    [...teachers].sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)),
    [teachers]
  );

  const filtered = useMemo(() => assignments.filter(a => {
    const q = search.toLowerCase();
    return (!q || a.subject_name?.toLowerCase().includes(q) || a.subject_code?.toLowerCase().includes(q) || a.classroom_name?.toLowerCase().includes(q) || a.teacher_name?.toLowerCase().includes(q)) && (!filterClassroom || String(a.classroom) === filterClassroom);
  }), [assignments, search, filterClassroom]);

  if (loading) return (
    <div className="space-y-5 px-4 md:px-6 py-6">
      <Skeleton.PageHeader />
      <Skeleton.CardGrid count={6} cols={3} />
    </div>
  );

  return (
    <div className="page-bottom-safe bg-slate-50/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Subject Assignments</h1>
          <p className="text-xs text-slate-500 mt-1">{assignments.length} assignments across {classrooms.length} sections</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/classes')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            View Sections
          </button>
          <Button variant="primary" onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Assign Subject
          </Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput placeholder="Search by subject, section, or teacher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterClassroom} onChange={e => setFilterClassroom(e.target.value)} containerClassName="sm:w-64">
            <option value="">All Sections</option>
            {groupedClassrooms.map(([level, items]) => (
              <optgroup key={level} label={level}>
                {items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12">
          <EmptyState icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} title="No Assignments Found" message={search || filterClassroom ? 'Try adjusting your filters' : 'Assign subjects to sections to get started'} />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Section</th>
                  <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Teacher</th>
                  <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3"><span className="text-sm font-bold text-slate-900">{a.classroom_name}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="blue" className="font-mono text-[10px]">{a.subject_code}</Badge>
                        <span className="text-sm font-semibold text-slate-700">{a.subject_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-sm text-slate-600">{a.teacher_name || '—'}</span></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(a)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(a)}>Remove</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-xs text-slate-500 font-semibold">{filtered.length} assignments</p>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
        <ModalHeader onClose={() => setShowModal(false)}>
          <ModalTitle title={editing ? 'Edit Assignment' : 'New Assignment'} subtitle="Subject Assignments" />
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select label="Section" required value={form.classroom} onChange={e => setForm({ ...form, classroom: e.target.value })}>
                  <option value="">— Select —</option>
                  {groupedClassrooms.map(([level, items]) => (
                    <optgroup key={level} label={level}>
                      {items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
                <Select label="Subject" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                  <option value="">— Select —</option>
                  {groupedSubjects.map(([level, items]) => (
                    <optgroup key={level} label={level}>
                      {items.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </div>
              <Select label="Teacher" required value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })}>
                <option value="">— Select —</option>
                {sortedTeachers.map(t => (
                  <option key={t.id} value={t.id}>{t.last_name}, {t.first_name}{t.staff_title ? ` (${t.staff_title})` : ''}</option>
                ))}
              </Select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editing ? 'Save Changes' : 'Create Assignment'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Assignment?"
        message={`Remove "${deleteTarget?.subject_name}" from "${deleteTarget?.classroom_name}"? This action cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}

const tabs = [
  { id: 'subjects',    label: 'Subjects',    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253" /></svg> },
  { id: 'assignments', label: 'Assignments', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
];

const SubjectsHub = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabId = searchParams.get('tab') || 'subjects';
  const setTab = (id) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', id);
    setSearchParams(p);
  };

  return (
    <div className="page-bottom-safe bg-slate-50 min-h-screen">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#5e2a84] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Subject Management</h1>
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Curriculum subjects & section assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTabId === tab.id ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        {activeTabId === 'subjects'    && <SubjectsTab />}
        {activeTabId === 'assignments' && <AssignmentsTab />}
      </div>
    </div>
  );
};

export default SubjectsHub;
