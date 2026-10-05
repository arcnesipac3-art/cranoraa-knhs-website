/**
 * StaffManagement — orchestrator for the Staff tab of /people (formerly
 * "Teachers").
 *
 * Owns the cross-cutting flows (add staff, edit record, manage roles,
 * import, password reset, chat, admin grant, delete) and the URL-driven
 * profile view (`?staff=<id>`); the directory itself lives in
 * ./staff/StaffDirectory.
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
  ModalBtnPrimary, ModalBtnSecondary, modalInputCls, modalSelectCls,
} from '../components/ui';
import TeacherProfileDrawer from '../components/people/TeacherProfileDrawer';
import StaffDirectory from './staff/StaffDirectory';
import { useStaffDirectory } from './staff/useStaffDirectory';
import ImportWizard from './students/ImportWizard';
import { STAFF_TITLES, downloadStaffTemplate } from './staff/staffHelpers';

const TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.'];

const emptyStaff = {
  title: '', first_name: '', last_name: '', email: '', sex: '',
  role: 'staff', staff_title: 'teacher',
};

const STAFF_IMPORT_COLUMNS = [
  { key: 'email', label: 'Email' },
  { key: 'name', label: 'Name' },
  { key: 'staff_title', label: 'Role' },
];

const StaffManagement = () => {
  const { user } = useCurrentUser();
  const dir = useStaffDirectory();
  const navigate = useNavigate();

  const staff = dir.staff;
  const classrooms = dir.classrooms;
  const isAdminUser = user?.role === 'admin';

  // ── URL-driven profile (?staff=<id>) ──────────────────────────────────────
  const profileId = dir.get('staff');
  const profileStaff = useMemo(
    () => staff.find((s) => String(s.id) === String(profileId)) || null,
    [staff, profileId],
  );
  const openProfile = (s) => dir.setParam('staff', s.id, { keepPage: true });
  const closeProfile = () => dir.setParam('staff', '', { keepPage: true });

  // A deep link can point at a row that isn't on the current page (or is
  // filtered out) — fetch it directly so the link always resolves.
  const [fetchedStaff, setFetchedStaff] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  useEffect(() => {
    if (!profileId || profileStaff) { setFetchedStaff(null); return undefined; }
    const ctrl = new AbortController();
    setProfileLoading(true);
    api.get(`/users/${profileId}/`, { signal: ctrl.signal })
      .then((res) => setFetchedStaff(res.data))
      .catch(() => setFetchedStaff(null))
      .finally(() => setProfileLoading(false));
    return () => ctrl.abort();
  }, [profileId, profileStaff]);
  const openProfileStaff = profileStaff || fetchedStaff;

  // ── Departments (admin-only membership editing) ───────────────────────────
  const [departments, setDepartments] = useState([]);
  useEffect(() => {
    if (!isAdminUser) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/departments/');
        if (!cancelled) setDepartments(Array.isArray(data) ? data : data?.results || []);
      } catch { /* optional — the edit modal degrades to "No department" */ }
    })();
    return () => { cancelled = true; };
  }, [isAdminUser]);

  // ── Add staff ─────────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState(emptyStaff);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await api.post('/admin/create-user/', {
        username: newStaff.email,
        ...newStaff,
        role: newStaff.role,
        staff_title: newStaff.staff_title,
        profile: { title: newStaff.title, sex: newStaff.sex },
      });

      setShowAddModal(false);
      setNewStaff(emptyStaff);
      dir.refetch();

      Swal.fire({
        icon: 'success',
        title: newStaff.role === 'admin' ? 'Admin Account Created' : 'Staff Account Created',
        html: `
          <div class="text-left space-y-2 text-sm">
            <p><strong>Role:</strong> ${newStaff.role === 'admin' ? 'Admin' : (STAFF_TITLES.find(t => t.value === newStaff.staff_title)?.label || newStaff.staff_title)}</p>
            <p><strong>Full Name:</strong> ${newStaff.first_name} ${newStaff.last_name}</p>
            <p><strong>Username/Email:</strong> ${response.data.username}</p>
            <p><strong>Temporary Password:</strong> <span class="bg-yellow-100 px-2 py-1 rounded font-mono text-lg border border-yellow-300 select-all">${response.data.temporary_password}</span></p>
            <p class="text-xs text-slate-500 mt-4 italic">Please provide this password to the ${newStaff.role === 'admin' ? 'admin' : 'staff member'}. They will be required to change it on their first login.</p>
          </div>`,
        confirmButtonColor: '#5e2a84',
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit staff record (+ admin-only department membership) ────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const selectedDeptIds = (editingStaff?.departments
    ?? (editingStaff?.department ? [editingStaff.department] : [])) || [];
  const selectableDepartments = departments.filter((d) => d.is_active !== false);
  const assignedArchived = departments.filter(
    (d) => d.is_active === false && selectedDeptIds.includes(d.id),
  );

  const toggleDept = (id) => setEditingStaff((prev) => {
    if (!prev) return prev;
    const current = prev.departments ?? (prev.department ? [prev.department] : []);
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    return { ...prev, departments: next };
  });

  const openEditModal = (s) => {
    setEditingStaff({
      ...s,
      profile: {
        title: s.profile?.title || '',
        phone_number: s.profile?.phone_number || '',
        sex: s.profile?.sex || '',
      },
    });
    setShowEditModal(true);
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        first_name: editingStaff.first_name,
        last_name: editingStaff.last_name,
        email: editingStaff.email,
        profile: {
          title: editingStaff.profile?.title,
          phone_number: editingStaff.profile?.phone_number,
          sex: editingStaff.profile?.sex,
        },
      };
      // Department membership is organizational only and admin-writable. It is
      // never sent for non-admins so a no-op payload can't trip the
      // serializer's permission guard.
      if (isAdminUser) payload.departments = selectedDeptIds;

      await api.patch(`/users/${editingStaff.id}/`, payload);
      setShowEditModal(false);
      setEditingStaff(null);
      dir.refetch();
      toast.success('Staff record updated');
    } catch (err) {
      const data = err.response?.data;
      toast.error(
        data?.departments?.[0] || data?.department?.[0] || data?.detail || data?.error || 'Failed to update staff record',
      );
    }
  };

  // ── Manage roles (staff_title + additional_roles) ─────────────────────────
  const [editingRolesId, setEditingRolesId] = useState(null);
  const [roleForm, setRoleForm] = useState({ staff_title: '', additional_roles: [] });

  const openRoleEditor = (s) => {
    const allTitles = [s.staff_title, ...(s.additional_roles || '').split(',').filter(Boolean)];
    setRoleForm({
      staff_title: s.staff_title || 'teacher',
      additional_roles: allTitles.filter((t) => t !== s.staff_title),
    });
    setEditingRolesId(s.id);
  };

  const toggleAdditionalRole = (title) => {
    setRoleForm((prev) => ({
      ...prev,
      additional_roles: prev.additional_roles.includes(title)
        ? prev.additional_roles.filter((t) => t !== title)
        : [...prev.additional_roles, title],
    }));
  };

  const handleSaveRoles = async () => {
    try {
      await api.post(`/users/${editingRolesId}/update-roles/`, {
        staff_title: roleForm.staff_title,
        additional_roles: roleForm.additional_roles,
      });
      setEditingRolesId(null);
      dir.refetch();
      toast.success('Roles updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update roles');
    }
  };

  // ── Import (guided wizard, dry-run validated) ─────────────────────────────
  const [showImportModal, setShowImportModal] = useState(false);

  // ── Per-staff actions ─────────────────────────────────────────────────────
  const handleResetPassword = async (staffId) => {
    const { value: password } = await Swal.fire({
      title: 'Reset Password',
      input: 'text',
      inputLabel: 'Enter temporary password',
      inputPlaceholder: 'Leave blank for auto-generation',
      showCancelButton: true,
      confirmButtonText: 'Reset',
      confirmButtonColor: '#f59e0b',
    });
    if (password === undefined) return;
    try {
      const response = await api.post(`/users/${staffId}/reset_password/`, { password });
      Swal.fire({
        icon: 'success',
        title: 'Password Reset',
        html: `New temporary password: <strong>${response.data.temporary_password}</strong><br/>They will be forced to change it on login.`,
      });
      dir.refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleStartChat = async (staffId) => {
    try {
      await api.post('/chat/rooms/get_or_create_private_chat/', { user_id: staffId });
      navigate('/communication-center');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open chat');
    }
  };

  const handleStatusChange = async (target, status, reason) => {
    await api.post(`/users/${target.id}/update_status/`, { status, reason });
  };

  const handleBulkStatus = async (ids, status, reason) => {
    await api.post('/users/bulk-update-status/', { user_ids: ids, status, reason });
  };

  const handleToggleAdmin = async (s) => {
    const action = s.is_admin ? 'Revoke Admin' : 'Grant Admin';
    const result = await Swal.fire({
      title: `${action}?`,
      text: s.is_admin
        ? `Remove admin privileges from ${s.first_name} ${s.last_name}?`
        : `Grant admin privileges to ${s.first_name} ${s.last_name}? They will be able to access the admin panel.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: s.is_admin ? '#ef4444' : '#8b5cf6',
      confirmButtonText: `Yes, ${action}`,
    });
    if (!result.isConfirmed) return;
    try {
      const response = await api.post(`/users/${s.id}/toggle_admin/`);
      toast.success(response.data.status);
      dir.refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update admin status');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Staff Account?',
      text: 'This action cannot be undone and will remove all records for this account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/users/${id}/`);
      if (String(profileId) === String(id)) closeProfile();
      dir.refetch();
      toast.success('Staff account deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete staff');
    }
  };

  const handleBulkDelete = async () => {
    const ids = dir.selectedIds;
    if (ids.length === 0) return;
    const result = await Swal.fire({
      title: `Delete ${ids.length} staff accounts?`,
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
      toast.success(`Deleted ${ids.length} staff accounts`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to perform bulk delete');
    }
  };

  useScrollLock(showAddModal || showEditModal || showImportModal || showEditModal || !!profileId);

  // ── Profile drawer (?staff=<id>) ──────────────────────────────────────────
  if (profileId && !openProfileStaff) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        {profileLoading ? (
          <span className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" aria-hidden="true" />
        ) : (
          <svg className="w-10 h-10 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        )}
        <h3 className="text-sm font-black text-slate-700">
          {profileLoading ? 'Loading staff profile…' : 'Staff account not found'}
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
      <TeacherProfileDrawer
        teacher={openProfileStaff}
        classrooms={classrooms}
        onClose={closeProfile}
        onResetPassword={handleResetPassword}
        onDelete={handleDelete}
        onStartChat={handleStartChat}
        currentUser={user}
      />
    );
  }

  return (
    <div className="space-y-4">
      <StaffDirectory
        dir={dir}
        user={user}
        onOpenProfile={openProfile}
        onAdd={() => { setNewStaff(emptyStaff); setShowAddModal(true); }}
        onImport={() => setShowImportModal(true)}
        onResetPassword={(s) => handleResetPassword(s.id)}
        onChat={(s) => handleStartChat(s.id)}
        onEdit={openEditModal}
        onRoles={openRoleEditor}
        onToggleAdmin={handleToggleAdmin}
        onDelete={(s) => handleDelete(s.id)}
        onBulkDelete={handleBulkDelete}
        onBulkStatus={handleBulkStatus}
        onStatusChange={handleStatusChange}
      />

      {/* Add Staff Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="md">
        <ModalHeader onClose={() => setShowAddModal(false)}>
          <ModalTitle
            title={newStaff.role === 'admin' ? 'Add New Admin' : 'Add New Staff'}
            subtitle={newStaff.role === 'admin' ? 'Create Admin Account' : 'Create Staff Account'}
          />
        </ModalHeader>
        <form onSubmit={handleAddStaff}>
          <ModalBody className="space-y-4">
            <ModalField label="Account Type" required>
              <select
                required
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value, staff_title: e.target.value === 'admin' ? '' : newStaff.staff_title })}
                className={modalSelectCls}
              >
                <option value="staff">Staff / Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </ModalField>
            {newStaff.role === 'staff' && (
              <ModalField label="Staff Role" required>
                <select required value={newStaff.staff_title} onChange={(e) => setNewStaff({ ...newStaff, staff_title: e.target.value })} className={modalSelectCls}>
                  {STAFF_TITLES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </ModalField>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ModalField label="Title" required>
                <select required value={newStaff.title} onChange={(e) => setNewStaff({ ...newStaff, title: e.target.value })} className={modalSelectCls}>
                  <option value="">Title</option>
                  {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </ModalField>
              <ModalField label="First Name" required>
                <input type="text" required value={newStaff.first_name} onChange={(e) => setNewStaff({ ...newStaff, first_name: e.target.value })} className={modalInputCls} placeholder="First name" />
              </ModalField>
              <ModalField label="Last Name" required>
                <input type="text" required value={newStaff.last_name} onChange={(e) => setNewStaff({ ...newStaff, last_name: e.target.value })} className={modalInputCls} placeholder="Last name" />
              </ModalField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ModalField label="Email Address" required>
                <input type="email" required value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} className={modalInputCls} placeholder="teacher@email.com" />
              </ModalField>
              <ModalField label="Sex" required>
                <select required value={newStaff.sex} onChange={(e) => setNewStaff({ ...newStaff, sex: e.target.value })} className={modalSelectCls}>
                  <option value="">Select Sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </ModalField>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalBtnSecondary onClick={() => setShowAddModal(false)}>Cancel</ModalBtnSecondary>
            <ModalBtnPrimary loading={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Account'}</ModalBtnPrimary>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={showEditModal && !!editingStaff}
        onClose={() => { setShowEditModal(false); setEditingStaff(null); }}
        size="md"
      >
        <ModalHeader onClose={() => { setShowEditModal(false); setEditingStaff(null); }}>
          <ModalTitle
            title="Edit Staff Record"
            subtitle={editingStaff?.profile?.title
              ? `${editingStaff.profile.title} ${editingStaff.first_name} ${editingStaff.last_name}`
              : `${editingStaff?.first_name || ''} ${editingStaff?.last_name || ''}`}
          />
        </ModalHeader>
        <form onSubmit={handleEditStaff}>
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ModalField label="Title" required>
                <select
                  required
                  value={editingStaff?.profile?.title || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, profile: { ...editingStaff.profile, title: e.target.value } })}
                  className={modalSelectCls}
                >
                  <option value="">Title</option>
                  {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </ModalField>
              <ModalField label="First Name" required>
                <input type="text" required value={editingStaff?.first_name || ''} onChange={(e) => setEditingStaff({ ...editingStaff, first_name: e.target.value })} className={modalInputCls} placeholder="First name" />
              </ModalField>
              <ModalField label="Last Name" required>
                <input type="text" required value={editingStaff?.last_name || ''} onChange={(e) => setEditingStaff({ ...editingStaff, last_name: e.target.value })} className={modalInputCls} placeholder="Last name" />
              </ModalField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ModalField label="Email Address" required>
                <input type="email" required value={editingStaff?.email || ''} onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })} className={modalInputCls} placeholder="teacher@email.com" />
              </ModalField>
              <ModalField label="Sex" required>
                <select
                  required
                  value={editingStaff?.profile?.sex || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, profile: { ...editingStaff.profile, sex: e.target.value } })}
                  className={modalSelectCls}
                >
                  <option value="">Select Sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </ModalField>
            </div>
            {isAdminUser && (
              <ModalField
                label="Departments"
                hint="Organizational membership only — it never changes this account's role or permissions. A person may belong to several; their module access is the union of all of them."
              >
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 max-h-44 overflow-y-auto space-y-1">
                  {selectableDepartments.length === 0 && assignedArchived.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No departments available.</p>
                  )}
                  {selectableDepartments.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDeptIds.includes(d.id)}
                        onChange={() => toggleDept(d.id)}
                        className="rounded border-slate-300 text-violet-600"
                      />
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded">{d.code}</span>
                      <span className="truncate">{d.name}</span>
                    </label>
                  ))}
                  {assignedArchived.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
                      <input type="checkbox" checked onChange={() => toggleDept(d.id)} className="rounded border-slate-300 text-violet-600" />
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded">{d.code}</span>
                      <span className="truncate">{d.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">archived</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {selectedDeptIds.length === 0
                    ? 'No department — this account is not department-managed.'
                    : `${selectedDeptIds.length} department${selectedDeptIds.length === 1 ? '' : 's'} selected`}
                  {' · '}Archived departments are not offered for new assignments.
                </p>
              </ModalField>
            )}
          </ModalBody>
          <ModalFooter>
            <ModalBtnSecondary onClick={() => { setShowEditModal(false); setEditingStaff(null); }}>Cancel</ModalBtnSecondary>
            <ModalBtnPrimary type="submit">Save Changes</ModalBtnPrimary>
          </ModalFooter>
        </form>
      </Modal>

      {/* Manage Roles Modal */}
      <Modal isOpen={!!editingRolesId} onClose={() => setEditingRolesId(null)} size="md">
        <ModalHeader onClose={() => setEditingRolesId(null)}>
          <ModalTitle
            title="Manage Roles"
            subtitle={editingRolesId
              ? `${staff.find((t) => String(t.id) === String(editingRolesId))?.first_name || ''} ${staff.find((t) => String(t.id) === String(editingRolesId))?.last_name || ''}`
              : ''}
          />
        </ModalHeader>
        <ModalBody className="space-y-5">
          <ModalField label="Primary Role">
            <select value={roleForm.staff_title} onChange={(e) => setRoleForm({ ...roleForm, staff_title: e.target.value })} className={modalSelectCls}>
              {STAFF_TITLES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </ModalField>
          <ModalField label="Additional Roles" hint="Click to toggle. Staff with multiple roles appear in multiple departments.">
            <div className="flex flex-wrap gap-2">
              {STAFF_TITLES.filter((t) => t.value !== roleForm.staff_title).map((t) => {
                const isActive = roleForm.additional_roles.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleAdditionalRole(t.value)}
                    className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${
                      isActive
                        ? 'bg-violet-100 text-violet-700 border-violet-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </ModalField>
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setEditingRolesId(null)}>Cancel</ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleSaveRoles}>Save Roles</ModalBtnPrimary>
        </ModalFooter>
      </Modal>

      {/* Guided import wizard (dry-run validation, row-numbered error report) */}
      <ImportWizard
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={dir.refetch}
        endpoint="/users/import_teachers_csv/"
        title="Import Staff"
        noun="staff member"
        nounPlural="staff"
        idLabel="Email"
        expectedColumns={
          <p><code className="font-mono">Email</code> · <code className="font-mono">Title</code> · <code className="font-mono">First Name</code> · <code className="font-mono">Last Name</code> · <code className="font-mono">Staff Title</code> · <code className="font-mono">Sex</code></p>
        }
        previewColumns={STAFF_IMPORT_COLUMNS}
        onDownloadTemplate={downloadStaffTemplate}
      />
    </div>
  );
};

export default StaffManagement;
