import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useFetch } from '../hooks/useFetch';
import {
  Card, CardHeader, CardBody, CardTitle, Button, Badge,
  Skeleton, EmptyState, Modal, ModalHeader, ModalBody, ModalFooter,
  ModalTitle, ModalField, ModalBtnPrimary, ModalBtnSecondary,
  modalInputCls, modalSelectCls, modalTextareaCls
} from '../components/ui';

/**
 * Subjects Page - DepEd Academic Style
 * Professional subject/curriculum management interface for administrators
 */

const GRADE_LEVELS = [
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
];

const EMPTY_FORM = { name: '', code: '', description: '', grade_level: '' };

const Subjects = () => {
  const { data: subjects, loading, refetch: fetchSubjects, setData: setSubjects } = useFetch('/subjects/');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (subject) => {
    setEditing(subject);
    setForm({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      grade_level: subject.grade_level,
    });
    setShowModal(true);
  };

  const handleDelete = async (subject) => {
    const result = await Swal.fire({
      title: 'Delete Subject?',
      text: `"${subject.name}" will be permanently removed. This may affect classrooms using this subject.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/subjects/${subject.id}/`);
      toast.success('Subject deleted');
      fetchSubjects();
    } catch {
      toast.error('Failed to delete subject');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Subject name is required');
    if (!form.code.trim()) return toast.error('Subject code is required');
    if (!form.grade_level) return toast.error('Grade level is required');
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/subjects/${editing.id}/`, form);
        toast.success('Subject updated');
      } else {
        await api.post('/subjects/', form);
        toast.success('Subject created');
      }
      setShowModal(false);
      fetchSubjects();
    } catch (err) {
      const msg = err.response?.data?.code?.[0] || err.response?.data?.detail || 'Failed to save subject';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Unique grade levels from data for filter
  const gradeLevels = subjects
    ? [...new Set(subjects.map(s => s.grade_level))]
        .sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 999) - (parseInt(b.replace(/\D/g, '')) || 999))
    : [];

  const filtered = subjects
    ? subjects.filter(s => {
        const q = search.toLowerCase();
        const matchSearch = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
        const matchLevel = !filterLevel || s.grade_level === filterLevel;
        return matchSearch && matchLevel;
      })
    : [];

  // Group by grade level for display
  const grouped = filtered.reduce((acc, s) => {
    const key = s.grade_level || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 space-y-4 md:space-y-6"
    >
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PAGE HEADER */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-violet-700 uppercase tracking-wide mb-1.5 sm:mb-2">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Curriculum Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Subjects
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 font-semibold">
            {(subjects?.length ?? 0)} subjects in the curriculum
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} className="w-full sm:w-auto self-stretch sm:self-auto justify-center text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Subject
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* FILTERS */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all"
              />
            </div>
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 rounded-md bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all"
            >
              <option value="">All Grade Levels</option>
              {gradeLevels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CONTENT */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {loading ? (
        <Skeleton.CardGrid />
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="p-6 sm:p-12">
            <EmptyState
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
              title="No Subjects Found"
              message={search || filterLevel ? 'Try adjusting your filters' : 'Add your first subject to get started'}
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {Object.entries(grouped).sort(([a], [b]) => {
              const numA = parseInt(a.replace(/\D/g, '')) || 999;
              const numB = parseInt(b.replace(/\D/g, '')) || 999;
              return numA - numB;
            }).map(([level, items]) => (
              <Card key={level} className="border-l-4 border-l-violet-500">
                <CardHeader divider className="bg-slate-50">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-violet-100 flex items-center justify-center font-extrabold text-xs sm:text-sm text-violet-700 border border-violet-200 flex-shrink-0">
                      {parseInt(level.replace(/\D/g, '')) || level.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base">{level}</CardTitle>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">{items.length} Subjects</p>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="md:hidden divide-y divide-slate-100">
                    {items.map(s => (
                      <div key={s.id} className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="blue" className="font-mono text-[10px]">
                                {s.code}
                              </Badge>
                            </div>
                            <p className="font-bold text-sm text-slate-900 leading-tight break-words">{s.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {s.description || <span className="italic text-slate-400">No description</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEdit(s)}
                            className="flex-1 text-xs"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(s)}
                            className="flex-1 text-xs"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider w-32">Code</th>
                          <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Subject Name</th>
                          <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase tracking-wider text-center w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <Badge variant="blue" className="font-mono">
                                {s.code}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-bold text-slate-900">{s.name}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 max-w-xs">
                              <span className="line-clamp-1">
                                {s.description || <span className="italic text-slate-400">No description</span>}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openEdit(s)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDelete(s)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          <p className="text-xs text-slate-500 font-semibold text-center">
            {filtered.length} entries · {Object.keys(grouped).length} grade levels
          </p>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
        <ModalHeader onClose={() => setShowModal(false)}>
          <ModalTitle
            title={editing ? 'Edit Subject' : 'New Subject'}
            subtitle="Subject Curriculum Details"
          />
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModalField label="Subject Code" required>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. MATH7"
                    className={modalInputCls + ' uppercase font-mono'}
                    required
                  />
                </ModalField>
                <ModalField label="Grade Level" required>
                  <select
                    value={form.grade_level}
                    onChange={e => setForm({ ...form, grade_level: e.target.value })}
                    className={modalSelectCls}
                    required
                  >
                    <option value="">— Select Level —</option>
                    {GRADE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </ModalField>
              </div>
              <ModalField label="Subject Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Mathematics"
                  className={modalInputCls}
                  required
                />
              </ModalField>
              <ModalField label="Description">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief subject overview (optional)"
                  className={modalTextareaCls}
                />
              </ModalField>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalBtnSecondary onClick={() => setShowModal(false)}>Cancel</ModalBtnSecondary>
            <ModalBtnPrimary loading={saving}>
              {editing ? 'Save Changes' : 'Create Subject'}
            </ModalBtnPrimary>
          </ModalFooter>
        </form>
      </Modal>
    </motion.div>
  );
};

export default Subjects;
