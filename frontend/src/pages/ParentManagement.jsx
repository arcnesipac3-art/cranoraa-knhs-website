import { useState, useMemo } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useParallelFetch } from '../hooks/useFetch';
import { useScrollLock } from '../hooks/useScrollLock';
import { Skeleton, EmptyState, Button } from '../components/ui';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalField, ModalBtnPrimary, ModalBtnSecondary, modalInputCls, modalSelectCls } from '../components/ui/Modal';
import ParentProfileDrawer from '../components/people/ParentProfileDrawer';

const emptyForm = { first_name: '', last_name: '', email: '', password: '' };

export default function ParentManagement() {
  const { data, loading, refetch } = useParallelFetch({
    parents: '/users/?role=parent',
    students: '/users/?role=student',
  });
  const parents = Array.isArray(data.parents) ? data.parents : [];
  const students = Array.isArray(data.students) ? data.students : [];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkedIds, setLinkedIds] = useState([]);
  const [linkSaving, setLinkSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewingParent, setViewingParent] = useState(null);

  useScrollLock(showAddModal || showLinkModal || viewingParent);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.post('/admin/create-user/', {
        username: form.email,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password || undefined,
        role: 'parent',
      });
      setShowAddModal(false);
      setForm(emptyForm);
      refetch();
      Swal.fire({
        icon: 'success',
        title: 'Parent Account Created',
        html: `
          <div class="text-left space-y-2 text-sm">
            <p><strong>Name:</strong> ${form.first_name} ${form.last_name}</p>
            <p><strong>Email / Username:</strong> ${res.data.username}</p>
            <p><strong>Temporary Password:</strong>
              <span class="bg-yellow-100 px-2 py-1 rounded font-mono text-base border border-yellow-300 select-all ml-1">
                ${res.data.temporary_password}
              </span>
            </p>
            <p class="text-xs text-slate-500 mt-3 italic">
              Share these credentials with the parent. They must change their password on first login.
            </p>
          </div>`,
        confirmButtonColor: '#5e2a84',
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create parent account');
    } finally { setSaving(false); }
  };

  const openLinkModal = (parent) => {
    setSelectedParent(parent);
    const current = parent.profile?.linked_students || [];
    setLinkedIds(current.map(s => (typeof s === 'object' ? s.id : s)));
    setLinkSearch('');
    setShowLinkModal(true);
  };

  const toggleLink = (studentId) => {
    setLinkedIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const saveLinks = async () => {
    if (!selectedParent) return;
    setLinkSaving(true);
    try {
      await api.patch(`/users/${selectedParent.id}/`, {
        profile: { linked_students: linkedIds },
      });
      toast.success('Linked students updated');
      setShowLinkModal(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update links');
    } finally { setLinkSaving(false); }
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: `Delete ${name}?`,
      text: 'This will permanently remove the parent account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/users/${id}/`);
      toast.success('Parent account deleted');
      refetch();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete';
      toast.error(msg);
    }
  };

  const handleResetPassword = async (parentId) => {
    const { value: pw } = await Swal.fire({
      title: 'Reset Password',
      input: 'text',
      inputLabel: 'New temporary password (leave blank to auto-generate)',
      inputPlaceholder: 'Optional',
      showCancelButton: true,
      confirmButtonText: 'Reset',
      confirmButtonColor: '#f59e0b',
    });
    if (pw === undefined) return;
    try {
      const res = await api.post(`/users/${parentId}/reset_password/`, { password: pw });
      Swal.fire({
        icon: 'success',
        title: 'Password Reset',
        html: `New temporary password: <strong class="font-mono text-lg">${res.data.temporary_password}</strong>`,
      });
    } catch { toast.error('Failed to reset password'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return parents.filter(p => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      const email = (p.email || '').toLowerCase();
      const matchesSearch = name.includes(q) || email.includes(q);
      const matchesStatus = !statusFilter || p.account_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [parents, search, statusFilter]);

  const filteredStudents = useMemo(() => {
    const q = linkSearch.toLowerCase();
    return students.filter(s => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const id = (s.username || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [students, linkSearch]);

  if (loading) return (
    <div className="space-y-5 px-4 md:px-6 py-6">
      <Skeleton.PageHeader />
      <Skeleton.CardGrid count={6} cols={3} />
    </div>
  );

  return (
    <div className="page-bottom-safe bg-slate-50">
      {/* Official Header */}
      <div className="bg-white border-b-2 border-slate-200 px-4 md:px-6 py-3 md:py-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 md:h-11 md:w-11 bg-[#5e2a84] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-wide">
              Parent Accounts
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Guardian Management & Student Linking
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 space-y-3 md:space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div></div>
        <button
          onClick={() => { setForm(emptyForm); setShowAddModal(true); }}
          className="flex items-center gap-1.5 bg-[#5e2a84] hover:bg-violet-700 text-white font-bold py-1.5 px-4 transition-colors text-xs uppercase tracking-wide"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Parent
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-50 border border-slate-200 p-3 flex gap-2">
        <svg className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-xs text-slate-600">
          <p className="font-bold">How it works:</p>
          <p className="text-slate-500 mt-0.5">
            1. Create a parent account with their email. &nbsp;
            2. Click <strong>Link Children</strong> to connect them to their student(s). &nbsp;
            3. Share the temporary password — they log in at <strong>/login → Parent tab</strong>.
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white p-2.5 border border-slate-200 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500 focus:bg-white transition-colors"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="py-1.5 pl-3 pr-8 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); }}
            className="text-[10px] font-bold text-violet-600 hover:underline whitespace-nowrap">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-slate-500 font-bold text-sm">No parent accounts yet.</p>
            <p className="text-slate-400 text-xs mt-1">Click "Add Parent" to create the first one.</p>
          </div>
        ) : (
          <div className="">
            <table className="w-full text-left">
              <thead className="bg-[#5e2a84]">
                <tr className="text-[9px] font-bold text-white uppercase tracking-widest">
                  <th className="px-4 py-2.5">Parent</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Email</th>
                  <th className="px-4 py-2.5">Linked Children</th>
                  <th className="px-4 py-2.5 hidden sm:table-cell">Status</th>
                  <th className="px-4 py-2.5 hidden lg:table-cell">Temp Password</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => {
                  const linked = p.profile?.linked_students || [];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{p.first_name} {p.last_name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Parent</p>
                          <p className="text-[10px] text-slate-400 md:hidden">{p.email || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-500 hidden md:table-cell">{p.email || '—'}</td>
                      <td className="px-4 py-3">
                        {linked.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">No children linked</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-h-[60px] overflow-hidden">
                            {linked.slice(0, 3).map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold border border-slate-200">
                                {typeof s === 'object' ? `${s.first_name} ${s.last_name}` : `Student #${s}`}
                              </span>
                            ))}
                            {linked.length > 3 && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold border border-slate-200">+{linked.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${
                          p.account_status === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                          p.account_status === 'suspended' ? 'text-rose-600 bg-rose-50 border-rose-200' :
                          'text-slate-500 bg-slate-50 border-slate-200'
                        }`}>{p.account_status}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {p.must_change_password ? (
                          <span className="font-mono text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 border border-amber-200 select-all cursor-help" title="Visible until parent changes password">
                            Pending
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Changed</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>
                          </button>
                          {openMenuId === p.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 shadow-lg py-1 z-50">
                                <button
                                  onClick={() => { setViewingParent(p); setOpenMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left"
                                >
                                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View Profile
                                </button>
                                <button
                                  onClick={() => { openLinkModal(p); setOpenMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left"
                                >
                                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  Link Children
                                </button>
                                <button
                                  onClick={() => { handleResetPassword(p.id); setOpenMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left"
                                >
                                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                  </svg>
                                  Reset Password
                                </button>
                                <button
                                  onClick={() => { handleDelete(p.id, `${p.first_name} ${p.last_name}`); setOpenMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-left"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete Account
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Create Parent Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="md">
        <ModalHeader onClose={() => setShowAddModal(false)}>
          <ModalTitle title="Create Parent Account" subtitle="A temporary password will be generated automatically." />
        </ModalHeader>
        <form onSubmit={handleCreate}>
          <ModalBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="First Name" required>
                <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className={modalInputCls} />
              </ModalField>
              <ModalField label="Last Name" required>
                <input required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className={modalInputCls} />
              </ModalField>
            </div>
            <ModalField label="Email Address" required hint="This will also be their username for login.">
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="parent@email.com" className={modalInputCls} />
            </ModalField>
            <ModalField label="Password" hint="Leave blank to auto-generate (optional)">
              <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Leave blank to auto-generate" className={modalInputCls} />
            </ModalField>
          </ModalBody>
          <ModalFooter>
            <ModalBtnSecondary onClick={() => setShowAddModal(false)}>Cancel</ModalBtnSecondary>
            <ModalBtnPrimary loading={saving}>{saving ? 'Creating...' : 'Create Account'}</ModalBtnPrimary>
          </ModalFooter>
        </form>
      </Modal>

      {/* Link Children Modal */}
      <Modal isOpen={showLinkModal && !!selectedParent} onClose={() => setShowLinkModal(false)} size="lg">
        <ModalHeader onClose={() => setShowLinkModal(false)}>
          <ModalTitle title="Link Children" subtitle={selectedParent ? `${selectedParent.first_name} ${selectedParent.last_name}` : ''} />
        </ModalHeader>
        <ModalBody className="p-0">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                placeholder="Search students by name or ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:bg-white" />
            </div>
            {linkedIds.length > 0 && (
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                {linkedIds.length} student{linkedIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[50vh]">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No students found.</p>
            ) : filteredStudents.map(s => {
              const isLinked = linkedIds.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleLink(s.id)}
                  className={`w-full flex items-center gap-3 p-2.5 border transition-colors text-left ${
                    isLinked
                      ? 'bg-violet-50 border-violet-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  <div className={`w-4.5 h-4.5 border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isLinked ? 'bg-violet-600 border-violet-600' : 'border-slate-300'
                  }`} style={{ width: '18px', height: '18px' }}>
                    {isLinked && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="w-7 h-7 bg-[#5e2a84] flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{s.first_name} {s.last_name}</p>
                    <p className="text-[9px] text-slate-400 truncate">
                      {s.username} · {s.profile?.grade_level || 'No grade'} · {s.profile?.classroom_name || 'No class'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setShowLinkModal(false)}>Cancel</ModalBtnSecondary>
          <ModalBtnPrimary loading={linkSaving} onClick={saveLinks}>{linkSaving ? 'Saving...' : 'Save Links'}</ModalBtnPrimary>
        </ModalFooter>
      </Modal>

      {/* Parent Profile Drawer */}
      {viewingParent && (
        <ParentProfileDrawer
          parent={viewingParent}
          students={students}
          onClose={() => setViewingParent(null)}
          onResetPassword={handleResetPassword}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
