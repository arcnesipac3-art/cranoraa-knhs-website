/**
 * ParentManagement — orchestrator for the Parents tab of /people.
 *
 * Owns the cross-cutting flows (add parent, link children, import, password
 * reset, delete, status change) and the URL-driven profile view
 * (`?parent=<id>`); the directory itself lives in ./parents/ParentDirectory.
 */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useScrollLock } from '../hooks/useScrollLock';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalField,
  ModalBtnPrimary, ModalBtnSecondary, modalInputCls,
} from '../components/ui';
import ParentProfileDrawer from '../components/people/ParentProfileDrawer';
import ParentDirectory from './parents/ParentDirectory';
import { useParentDirectory } from './parents/useParentDirectory';
import ImportWizard from './students/ImportWizard';
import { downloadParentTemplate, parentChildren } from './parents/parentHelpers';

const emptyForm = { first_name: '', last_name: '', email: '', password: '' };

const PARENT_IMPORT_COLUMNS = [
  { key: 'email', label: 'Email' },
  { key: 'name', label: 'Name' },
];

export default function ParentManagement() {
  const { user } = useCurrentUser();
  const dir = useParentDirectory();
  const navigate = useNavigate();

  const parents = dir.parents;
  const students = dir.students;

  // ── URL-driven profile (?parent=<id>) ─────────────────────────────────────
  const profileId = dir.get('parent');
  const profileParent = useMemo(
    () => parents.find((p) => String(p.id) === String(profileId)) || null,
    [parents, profileId],
  );
  const openProfile = (p) => dir.setParam('parent', p.id, { keepPage: true });
  const closeProfile = () => dir.setParam('parent', '', { keepPage: true });

  // A deep link can point at a row that isn't on the current page (or is
  // filtered out) — fetch it directly so the link always resolves.
  const [fetchedParent, setFetchedParent] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  useEffect(() => {
    if (!profileId || profileParent) { setFetchedParent(null); return undefined; }
    const ctrl = new AbortController();
    setProfileLoading(true);
    api.get(`/users/${profileId}/`, { signal: ctrl.signal })
      .then((res) => setFetchedParent(res.data))
      .catch(() => setFetchedParent(null))
      .finally(() => setProfileLoading(false));
    return () => ctrl.abort();
  }, [profileId, profileParent]);
  const openProfileParent = profileParent || fetchedParent;

  // ── Add parent ────────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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
      dir.refetch();
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

  // ── Import (guided wizard, dry-run validated) ─────────────────────────────
  const [showImportModal, setShowImportModal] = useState(false);

  // ── Link children ─────────────────────────────────────────────────────────
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkedIds, setLinkedIds] = useState([]);
  const [linkSaving, setLinkSaving] = useState(false);

  const openLinkModal = (parent) => {
    setSelectedParent(parent);
    setLinkedIds(parentChildren(parent).map((s) => (typeof s === 'object' && s !== null ? s.id : s)));
    setLinkSearch('');
    setShowLinkModal(true);
  };

  const toggleLink = (studentId) => {
    setLinkedIds((prev) => (prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]));
  };

  const saveLinks = async () => {
    if (!selectedParent) return;
    setLinkSaving(true);
    try {
      await api.patch(`/users/${selectedParent.id}/`, { profile: { linked_students: linkedIds } });
      toast.success('Linked students updated');
      setShowLinkModal(false);
      dir.refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update links');
    } finally { setLinkSaving(false); }
  };

  const filteredStudents = useMemo(() => {
    const q = linkSearch.toLowerCase();
    return students.filter((s) => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const id = (s.username || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [students, linkSearch]);

  // ── Per-parent actions ────────────────────────────────────────────────────
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

  const handleStatusChange = async (target, status, reason) => {
    await api.post(`/users/${target.id}/update_status/`, { status, reason });
  };

  const handleBulkStatus = async (ids, status, reason) => {
    await api.post('/users/bulk-update-status/', { user_ids: ids, status, reason });
  };

  const handleDelete = async (id) => {
    const target = parents.find((p) => String(p.id) === String(id));
    const name = target ? `${target.first_name} ${target.last_name}` : 'this parent';
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
      if (String(profileId) === String(id)) closeProfile();
      dir.refetch();
      toast.success('Parent account deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleBulkDelete = async () => {
    const ids = dir.selectedIds;
    if (ids.length === 0) return;
    const result = await Swal.fire({
      title: `Delete ${ids.length} parent accounts?`,
      text: 'This action cannot be undone. All associated data will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, delete ${ids.length} accounts`,
    });
    if (!result.isConfirmed) return;
    try {
      await api.post('/users/bulk-delete/', { user_ids: ids });
      dir.clearSelection();
      dir.refetch();
      toast.success(`Deleted ${ids.length} parent accounts`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to perform bulk delete');
    }
  };

  const handleStartChat = async (parentId) => {
    try {
      await api.post('/chat/rooms/get_or_create_private_chat/', { user_id: parentId });
      navigate('/communication-center');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open chat');
    }
  };

  useScrollLock(showAddModal || showLinkModal || showImportModal || !!profileId);

  // ── Profile drawer (?parent=<id>) ─────────────────────────────────────────
  if (profileId && !openProfileParent) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        {profileLoading ? (
          <span className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" aria-hidden="true" />
        ) : (
          <svg className="w-10 h-10 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        )}
        <h3 className="text-sm font-black text-slate-700">
          {profileLoading ? 'Loading parent profile…' : 'Parent account not found'}
        </h3>
        {!profileLoading && (
          <p className="text-xs text-slate-400">It may have been deleted, or you may not have access to it.</p>
        )}
        <button
          type="button"
          onClick={closeProfile}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-[0.08em] rounded-lg bg-[#5e2a84] text-white hover:bg-violet-700"
        >
          Back to directory
        </button>
      </div>
    );
  }

  if (profileId) {
    return (
      <ParentProfileDrawer
        parent={openProfileParent}
        students={students}
        onClose={closeProfile}
        onResetPassword={handleResetPassword}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* How-it-works banner for the linking flow */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-2.5">
        <svg className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-[11px] text-slate-600">
          <p className="font-bold text-slate-700">How it works:</p>
          <p className="text-slate-500 mt-0.5">
            1. Create a parent account with their email. &nbsp;
            2. Click <strong>Link Children</strong> to connect them to their student(s). &nbsp;
            3. Share the temporary password — they log in at <strong>/login → Parent tab</strong>.
          </p>
        </div>
      </div>

      <ParentDirectory
        dir={dir}
        user={user}
        onOpenProfile={openProfile}
        onAdd={() => { setForm(emptyForm); setShowAddModal(true); }}
        onImport={() => setShowImportModal(true)}
        onLink={openLinkModal}
        onChat={(p) => handleStartChat(p.id)}
        onResetPassword={(p) => handleResetPassword(p.id)}
        onDelete={(p) => handleDelete(p.id)}
        onBulkDelete={handleBulkDelete}
        onBulkStatus={handleBulkStatus}
        onStatusChange={handleStatusChange}
      />

      {/* Create Parent Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="md">
        <ModalHeader onClose={() => setShowAddModal(false)}>
          <ModalTitle title="Create Parent Account" subtitle="A temporary password will be generated automatically." />
        </ModalHeader>
        <form onSubmit={handleCreate}>
          <ModalBody className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ModalField label="First Name" required>
                <input required value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} className={modalInputCls} />
              </ModalField>
              <ModalField label="Last Name" required>
                <input required value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} className={modalInputCls} />
              </ModalField>
            </div>
            <ModalField label="Email Address" required hint="This will also be their username for login.">
              <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="parent@email.com" className={modalInputCls} />
            </ModalField>
            <ModalField label="Password" hint="Leave blank to auto-generate (optional)">
              <input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Leave blank to auto-generate" className={modalInputCls} />
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
              <input
                type="text"
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                placeholder="Search students by name or ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:bg-white"
              />
            </div>
            {linkedIds.length > 0 && (
              <p className="text-[9px] text-slate-500 font-bold tracking-[0.1em] mt-1.5">
                {linkedIds.length} student{linkedIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 max-h-[50vh]">
            {dir.metaLoading ? (
              <p className="text-center text-slate-400 text-sm py-8">Loading students…</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No students found.</p>
            ) : filteredStudents.map((s) => {
              const isLinked = linkedIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleLink(s.id)}
                  className={`w-full flex items-center gap-3 p-2.5 border transition-colors text-left ${
                    isLinked
                      ? 'bg-violet-50 border-violet-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 border flex items-center justify-center flex-shrink-0 transition-colors ${isLinked ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}
                    style={{ width: '18px', height: '18px' }}
                  >
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

      {/* Guided import wizard (dry-run validation, row-numbered error report) */}
      <ImportWizard
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={dir.refetch}
        endpoint="/users/import_parents_csv/"
        title="Import Parents"
        noun="parent"
        nounPlural="parents"
        idLabel="Email"
        expectedColumns={
          <p><code className="font-mono">Email</code> · <code className="font-mono">First Name</code> · <code className="font-mono">Last Name</code> · <code className="font-mono">Password</code> (optional)</p>
        }
        previewColumns={PARENT_IMPORT_COLUMNS}
        onDownloadTemplate={downloadParentTemplate}
      />
    </div>
  );
}
