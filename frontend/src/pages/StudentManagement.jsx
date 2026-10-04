/**
 * StudentManagement — orchestrator for the Students tab of /people.
 *
 * Owns the cross-cutting flows (add student, import, badge award, assign
 * section, password reset, chat, delete) and the URL-driven profile view
 * (`?student=<id>`); the directory itself lives in ./students/StudentDirectory.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useScrollLock } from '../hooks/useScrollLock';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalField, ModalBtnPrimary, ModalBtnSecondary, modalInputCls, modalSelectCls } from '../components/ui';
import { AssignSectionModal } from '../components/modals/AssignSectionModal';
import StudentDirectory from './students/StudentDirectory';
import { useStudentDirectory } from './students/useStudentDirectory';
import StudentProfileView from './students/StudentProfileView';
import ImportWizard from './students/ImportWizard';

const StudentManagement = () => {
  const { user } = useCurrentUser();
  const dir = useStudentDirectory();

  const students = dir.students;
  const classrooms = dir.classrooms;

  // ── URL-driven full profile (?student=<id>) ───────────────────────────────
  const profileId = dir.get('student');
  const profileStudent = useMemo(
    () => students.find(s => String(s.id) === String(profileId)) || null,
    [students, profileId],
  );
  const openProfile = (student) => dir.setParam('student', student.id, { keepPage: true });
  const closeProfile = () => dir.setParam('student', '', { keepPage: true });

  // ── Add student ───────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStudent, setNewStudent] = useState({ username: '', first_name: '', last_name: '', email: '', password: '', grade_level: '', sex: '' });

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await api.post('/admin/create-user/', {
        ...newStudent,
        role: 'student',
        profile: {
          lrn: newStudent.username,
          grade_level: newStudent.grade_level,
          sex: newStudent.sex,
        },
      });

      setShowAddModal(false);
      setNewStudent({ username: '', first_name: '', last_name: '', email: '', password: '', grade_level: '', sex: '' });
      dir.refetch();

      Swal.fire({
        icon: 'success',
        title: 'Account Created',
        html: `
          <div class="text-left space-y-2 text-sm">
            <p><strong>Student ID:</strong> ${response.data.username}</p>
            <p><strong>Temporary Password:</strong> <span class="bg-yellow-100 px-2 py-1 rounded font-mono text-lg border border-yellow-300 select-all">${response.data.temporary_password}</span></p>
            <p class="text-xs text-slate-500 mt-4 italic">Please provide this password to the student. They will be required to change it on their first login.</p>
          </div>
        `,
        confirmButtonColor: '#5e2a84',
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create student');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Import (guided wizard: upload → validate → review → confirm → result) ────────
  const [showImportModal, setShowImportModal] = useState(false);

  // ── Destructive (admin + audit on the backend) ────────────────────────────
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Archive this student record?',
      text: 'The account and its grades, attendance and enrollment records will be permanently removed.',
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
      toast.success('Student account deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete student');
    }
  };

  const handleBulkDelete = async () => {
    const ids = dir.selectedIds;
    if (ids.length === 0) return;
    const result = await Swal.fire({
      title: `Delete ${ids.length} students?`,
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
      toast.success(`Deleted ${ids.length} student accounts`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to perform bulk delete');
    }
  };

  // ── Per-student actions (used by row menu + profile view) ─────────────────
  const handleResetPassword = async (studentId) => {
    const result = await Swal.fire({
      title: 'Reset Password',
      text: 'Enter a new temporary password or leave blank for auto-generation:',
      input: 'text',
      inputPlaceholder: 'New password (optional)',
      showCancelButton: true,
      confirmButtonText: 'Reset',
      confirmButtonColor: '#f59e0b',
    });
    if (!result.isConfirmed) return;
    try {
      const response = await api.post(`/users/${studentId}/reset_password/`, { password: result.value });
      Swal.fire({
        icon: 'success',
        title: 'Password Reset',
        html: `New temporary password: <strong>${response.data.temporary_password}</strong><br/>Please provide this to the student. They will be forced to change it on login.`,
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    }
  };

  // ── Assign section ────────────────────────────────────────────────────────
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStudent, setAssignStudent] = useState(null);

  const handleAssignSection = (student) => {
    setAssignStudent(student);
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async (classroomId) => {
    if (!assignStudent) return;
    try {
      await api.post('/enrollments/assign-classroom/', {
        student: parseInt(assignStudent.id, 10),
        classroom: parseInt(classroomId, 10),
      });
      const classroom = classrooms.find(c => String(c.id) === String(classroomId));
      toast.success(`Assigned to ${classroom?.name || 'section'}`);
      setShowAssignModal(false);
      setAssignStudent(null);
      dir.refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail?.[0] || 'Failed to assign section');
    }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const navigate = useNavigate();
  const handleStartChat = async (studentId) => {
    try {
      await api.post('/chat/rooms/get_or_create_private_chat/', { user_id: studentId });
      navigate('/communication-center');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start chat');
    }
  };

  // ── Award badge ───────────────────────────────────────────────────────────
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeStudentId, setBadgeStudentId] = useState(null);
  const [availableBadges, setAvailableBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [badgeReason, setBadgeReason] = useState('');
  const [awardingBadge, setAwardingBadge] = useState(false);

  const handleAwardBadge = async (studentId) => {
    setBadgeStudentId(studentId);
    setSelectedBadge(null);
    setBadgeReason('');
    setShowBadgeModal(true);
    try {
      const res = await api.get('/badges/');
      setAvailableBadges(res.data.results || res.data);
    } catch { toast.error('Failed to load badges'); }
  };

  const handleConfirmAward = async () => {
    if (!selectedBadge) return toast.error('Select a badge');
    setAwardingBadge(true);
    try {
      await api.post('/award-badge/', { student_id: badgeStudentId, badge_id: selectedBadge.id, reason: badgeReason });
      toast.success(`Badge "${selectedBadge.name}" awarded!`);
      setShowBadgeModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to award badge');
    }
    setAwardingBadge(false);
  };

  useScrollLock(showAddModal || showImportModal || showAssignModal || showBadgeModal);

  // ── Full profile view (?student=<id>) ─────────────────────────────────────
  if (profileId) {
    return (
      <StudentProfileView
        userId={profileId}
        fallbackStudent={profileStudent}
        currentUser={user}
        classrooms={classrooms}
        onBack={closeProfile}
        onResetPassword={handleResetPassword}
        onAssignSection={handleAssignSection}
        onStartChat={handleStartChat}
        onAwardBadge={handleAwardBadge}
        onDelete={handleDelete}
        onChanged={dir.refetch}
      />
    );
  }

  return (
    <div className="space-y-4">
      <StudentDirectory
        dir={dir}
        user={user}
        onOpenProfile={openProfile}
        onAdd={() => setShowAddModal(true)}
        onImport={() => setShowImportModal(true)}
        onResetPassword={(s) => handleResetPassword(s.id)}
        onChat={(s) => handleStartChat(s.id)}
        onBadge={(s) => handleAwardBadge(s.id)}
        onDelete={(s) => handleDelete(s.id)}
        onBulkDelete={handleBulkDelete}
        onAssignSingle={handleAssignSection}
      />

      {/* Add Student Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="md">
        <ModalHeader onClose={() => setShowAddModal(false)}>
          <ModalTitle title="Add New Student" subtitle="Create Student Account" />
        </ModalHeader>
        <form onSubmit={handleAddStudent}>
          <ModalBody className="space-y-3">
            <ModalField label="Student ID (LRN)" required>
              <input required value={newStudent.username} onChange={e => setNewStudent({ ...newStudent, username: e.target.value })}
                placeholder="12-digit LRN" className={modalInputCls} />
            </ModalField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ModalField label="First Name" required>
                <input required value={newStudent.first_name} onChange={e => setNewStudent({ ...newStudent, first_name: e.target.value })}
                  className={modalInputCls} />
              </ModalField>
              <ModalField label="Last Name" required>
                <input required value={newStudent.last_name} onChange={e => setNewStudent({ ...newStudent, last_name: e.target.value })}
                  className={modalInputCls} />
              </ModalField>
            </div>
            <ModalField label="Email" hint="Optional">
              <input type="email" value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                className={modalInputCls} />
            </ModalField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ModalField label="Grade Level" required>
                <select required value={newStudent.grade_level} onChange={e => setNewStudent({ ...newStudent, grade_level: e.target.value })}
                  className={modalSelectCls}>
                  <option value="">Select Grade</option>
                  {['7', '8', '9', '10', '11', '12'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </ModalField>
              <ModalField label="Sex" required>
                <select required value={newStudent.sex} onChange={e => setNewStudent({ ...newStudent, sex: e.target.value })}
                  className={modalSelectCls}>
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

      {/* Guided import wizard (dry-run validation, row-numbered error report) */}
      <ImportWizard
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={dir.refetch}
      />

      <AssignSectionModal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setAssignStudent(null); }}
        onConfirm={handleConfirmAssign}
        student={assignStudent}
        classrooms={classrooms}
        title="Assign Section"
        confirmText="Assign"
      />

      {/* Award Badge Modal */}
      <Modal isOpen={showBadgeModal} onClose={() => setShowBadgeModal(false)} size="md">
        <ModalHeader onClose={() => setShowBadgeModal(false)}>
          <ModalTitle title="Award Badge" subtitle="Select a badge to award" />
        </ModalHeader>
        <ModalBody className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {availableBadges.map(badge => (
              <button key={badge.id} type="button" onClick={() => setSelectedBadge(badge)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${selectedBadge?.id === badge.id
                  ? 'bg-violet-50 border-violet-400 ring-2 ring-violet-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <span className="text-2xl mb-1">{badge.icon}</span>
                <span className="text-xs font-bold text-slate-800">{badge.name}</span>
                <span className="text-[10px] text-slate-400">{badge.points} pts</span>
              </button>
            ))}
          </div>
          <ModalField label="Reason (optional)">
            <input value={badgeReason} onChange={e => setBadgeReason(e.target.value)}
              placeholder="Why is this badge being awarded?" className={modalInputCls} />
          </ModalField>
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setShowBadgeModal(false)}>Cancel</ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleConfirmAward} disabled={!selectedBadge || awardingBadge}>
            {awardingBadge ? 'Awarding...' : 'Award Badge'}
          </ModalBtnPrimary>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default StudentManagement;
