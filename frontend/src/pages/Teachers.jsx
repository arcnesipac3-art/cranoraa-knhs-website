import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useParallelFetch } from '../hooks/useFetch';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { useScrollLock } from '../hooks/useScrollLock';
import { LoadingSpinner, EmptyState, Button } from '../components/ui';
import { administration, faculty, getInitials } from '../data/facultyData';
import TeacherProfileDrawer from '../components/people/TeacherProfileDrawer';

// ── Build a lookup: lowercase last name → photo path from facultyData ─────────
const FACULTY_PHOTO_MAP = (() => {
  const map = {};
  [...administration, ...faculty].forEach(p => {
    if (p.photo) {
      // key by last name (last word before a comma or period chain)
      const parts = p.name.split(' ');
      const lastName = parts[parts.length - 1].replace(/[.,]$/, '').toLowerCase();
      map[lastName] = p.photo;
      // also key by full name normalised
      map[p.name.toLowerCase()] = p.photo;
    }
  });
  return map;
})();

/** Resolve the best available photo for a portal teacher object */
export function resolvePhoto(teacher) {
  // 1. profile_picture set by seed command (Vercel URL)
  if (teacher.profile?.profile_picture) return teacher.profile.profile_picture;
  // 2. local fallback: match by last name in facultyData
  const lastName = (teacher.last_name || '').toLowerCase();
  if (FACULTY_PHOTO_MAP[lastName]) return FACULTY_PHOTO_MAP[lastName];
  // 3. full-name match
  const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase();
  if (FACULTY_PHOTO_MAP[fullName]) return FACULTY_PHOTO_MAP[fullName];
  return null;
}

// ── Portrait photo / initials avatar ──────────────────────────────────────────
function TeacherAvatar({ teacher, size = 'card' }) {
  const [imgError, setImgError] = useState(false);
  const photo = resolvePhoto(teacher);
  const showPhoto = photo && !imgError;
  const name = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
  const initials = getInitials(name || teacher.username || '?');

  if (size === 'card') {
    return (
      <div className="w-full aspect-[3/4] bg-slate-100 overflow-hidden relative">
        {showPhoto ? (
          <img
            src={photo}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover object-top"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-50 to-violet-100">
            <span className="text-3xl font-black text-violet-400 select-none">{initials}</span>
          </div>
        )}
        {/* Status dot overlay */}
        <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
          teacher.account_status === 'active' ? 'bg-emerald-400' :
          teacher.account_status === 'suspended' ? 'bg-rose-400' : 'bg-slate-300'
        }`} />
      </div>
    );
  }

  // inline small circle variant (for modal headers etc.)
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-violet-100 flex-shrink-0 flex items-center justify-center">
      {showPhoto ? (
         <img src={photo} alt={name} className="w-full h-full object-cover object-top" loading="lazy" onError={() => setImgError(true)} />
      ) : (
        <span className="text-sm font-black text-violet-500">{initials}</span>
      )}
    </div>
  );
}

const Teachers = () => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const { data, loading, refetch } = useParallelFetch({
    teachers: '/users/?role=staff',
    classrooms: '/classrooms/',
  });
  const teachers = useMemo(() => Array.isArray(data.teachers) ? data.teachers : [], [data.teachers]);
  const classrooms = useMemo(() => Array.isArray(data.classrooms) ? data.classrooms : [], [data.classrooms]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingRolesId, setEditingRolesId] = useState(null);
  const [roleForm, setRoleForm] = useState({ staff_title: '', additional_roles: [] });
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [newTeacher, setNewTeacher] = useState({
    title: '',
    first_name: '',
    last_name: '',
    email: '',
    sex: '',
    staff_title: 'teacher'
  });

  useScrollLock(showAddModal || showEditModal || showImportModal || viewingTeacher);

  const STAFF_TITLES = [
    // ── DepEd teaching ranks ──────────────────────────────────────────────
    { value: 'teacher_i',                  label: 'Teacher I' },
    { value: 'teacher_ii',                 label: 'Teacher II' },
    { value: 'teacher_iii',                label: 'Teacher III' },
    { value: 'teacher_iv',                 label: 'Teacher IV' },
    { value: 'teacher_v',                  label: 'Teacher V' },
    { value: 'teacher_vi',                 label: 'Teacher VI' },
    { value: 'master_teacher_i',           label: 'Master Teacher I' },
    { value: 'master_teacher_ii',          label: 'Master Teacher II' },
    { value: 'special_science_teacher_i',  label: 'Special Science Teacher I' },
    { value: 'als_teacher',                label: 'ALS Teacher' },
    // ── Administrative / non-teaching ────────────────────────────────────
    { value: 'principal',                  label: 'School Principal I' },
    { value: 'guidance_counselor',         label: 'Guidance Counselor' },
    { value: 'administrative_officer',     label: 'Administrative Officer I' },
    { value: 'admin_assistant',            label: 'Administrative Assistant' },
    { value: 'registrar',                  label: 'Registrar' },
    { value: 'librarian',                  label: 'Librarian' },
    { value: 'it_staff',                   label: 'IT Staff' },
    { value: 'cashier',                    label: 'Cashier' },
    // ── Legacy / fallback ────────────────────────────────────────────────
    { value: 'teacher',                    label: 'Teacher (Generic)' },
    { value: 'advisory',                   label: 'Advisory' },
    { value: 'other',                      label: 'Other' },
  ];

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await api.post('/admin/create-user/', { 
        username: newTeacher.email, 
        ...newTeacher, 
        role: 'staff',
        staff_title: newTeacher.staff_title,
        profile: {
          title: newTeacher.title,
          sex: newTeacher.sex
        }
      });
      
      setShowAddModal(false);
      setNewTeacher({
        email: '',
        first_name: '',
        last_name: '',
        title: '',
        sex: '',
        staff_title: 'teacher'
      });
      refetch();

      Swal.fire({
        icon: 'success',
        title: 'Staff Account Created',
        html: `
          <div class="text-left space-y-2 text-sm">
            <p><strong>Role:</strong> ${STAFF_TITLES.find(t => t.value === newTeacher.staff_title)?.label || newTeacher.staff_title}</p>
            <p><strong>Full Name:</strong> ${newTeacher.first_name} ${newTeacher.last_name}</p>
            <p><strong>Username/Email:</strong> ${response.data.username}</p>
            <p><strong>Temporary Password:</strong> <span class="bg-yellow-100 px-2 py-1 rounded font-mono text-lg border border-yellow-300 select-all">${response.data.temporary_password}</span></p>
            <p class="text-xs text-slate-500 mt-4 italic">Please provide this password to the staff member. They will be required to change it on their first login.</p>
          </div>
        `,
        confirmButtonColor: '#9333ea'
      });
    } catch (err) {
      console.error('Failed to add staff:', err);
      toast.error(err.response?.data?.error || 'Failed to add staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTeacher = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/users/${editingTeacher.id}/`, {
        first_name: editingTeacher.first_name,
        last_name: editingTeacher.last_name,
        email: editingTeacher.email,
        profile: {
          title: editingTeacher.profile?.title,
          phone_number: editingTeacher.profile?.phone_number,
          sex: editingTeacher.profile?.sex
        }
      });
      setShowEditModal(false);
      setEditingTeacher(null);
      refetch();
      toast.success('Teacher updated successfully!');
    } catch (err) {
      console.error('Failed to update teacher:', err);
      toast.error(err.response?.data?.error || 'Failed to update teacher');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Teacher?',
      text: "This action cannot be undone and will remove all teacher records.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/users/${id}/`);
        refetch();
        toast.success('Teacher account deleted');
      } catch (err) {
        console.error('Failed to delete teacher:', err);
        toast.error('Failed to delete teacher');
      }
    }
  };

  const handleStartChat = async (teacherId) => {
    try {
      await api.post('/chat/rooms/get_or_create_private_chat/', { user_id: teacherId });
      navigate('/communication-center');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to open chat';
      toast.error(msg);
    }
  };

  const handleSaveRoles = async (teacherId) => {
    try {
      await api.post(`/users/${teacherId}/update-roles/`, {
        staff_title: roleForm.staff_title,
        additional_roles: roleForm.additional_roles,
      });
      setEditingRolesId(null);
      refetch();
      toast.success('Roles updated');
    } catch (err) {
      console.error('Failed to update roles:', err);
      toast.error(err.response?.data?.error || 'Failed to update roles');
    }
  };

  const openRoleEditor = (teacher) => {
    const allTitles = [teacher.staff_title, ...(teacher.additional_roles || '').split(',').filter(Boolean)];
    setRoleForm({
      staff_title: teacher.staff_title || 'teacher',
      additional_roles: allTitles.filter(t => t !== teacher.staff_title),
    });
    setEditingRolesId(teacher.id);
    setActiveMenu(null);
  };

  const toggleAdditionalRole = (title) => {
    setRoleForm(prev => {
      const exists = prev.additional_roles.includes(title);
      return {
        ...prev,
        additional_roles: exists
          ? prev.additional_roles.filter(t => t !== title)
          : [...prev.additional_roles, title],
      };
    });
  };

  const handleResetPassword = async (teacherId) => {
    const { value: password } = await Swal.fire({
      title: 'Reset Password',
      input: 'text',
      inputLabel: 'Enter temporary password',
      inputPlaceholder: 'Leave blank for auto-generation',
      showCancelButton: true,
      confirmButtonText: 'Reset',
      confirmButtonColor: '#f59e0b',
    });

    if (password !== undefined) {
      try {
        const response = await api.post(`/users/${teacherId}/reset_password/`, { password });
        Swal.fire({
          icon: 'success',
          title: 'Password Reset',
          html: `New temporary password: <strong>${response.data.temporary_password}</strong><br/>The teacher will be forced to change it on login.`,
        });
        refetch();
      } catch (err) {
        toast.error('Failed to reset password');
      }
    }
  };

  const handleToggleStatus = async (teacher, newStatus) => {
    try {
      const response = await api.post(`/users/${teacher.id}/update_status/`, { status: newStatus });
      toast.success(response.data.status);
      refetch();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleBulkStatus = async (newStatus) => {
    if (selectedIds.length === 0) return;
    const result = await Swal.fire({
      title: `Bulk ${newStatus}?`,
      text: `This will change ${selectedIds.length} teacher(s) to ${newStatus}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'active' ? '#10b981' : newStatus === 'suspended' ? '#ef4444' : '#6b7280',
      confirmButtonText: `Yes, ${newStatus} all`,
    });
    if (!result.isConfirmed) return;
    try {
      await api.post('/v1/users/bulk-update-status/', { user_ids: selectedIds, status: newStatus });
      toast.success(`${selectedIds.length} teacher(s) updated to ${newStatus}`);
      setSelectedIds([]);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleExportExcel = () => {
    const data = teachers.map(t => ({
      'Title': t.profile?.title || '',
      'First Name': t.first_name,
      'Last Name': t.last_name,
      'Email': t.email,
      'Phone': t.profile?.phone_number || '',
      'Temp Password': t.must_change_password ? 'Pending' : 'Changed',
      'Status': t.account_status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers");
    XLSX.writeFile(wb, `teachers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exported successfully');
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Faculty Directory', 14, 20);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    const headers = ['Name', 'Email', 'Phone', 'Status'];
    const colWidths = [70, 60, 30, 22];
    let y = 40;

    doc.setFillColor(45, 27, 77); // #2D1B4D
    doc.rect(14, y - 5, 182, 7, 'F');
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    
    let x = 14;
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });

    y += 10;
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");

    teachers.forEach((t, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      
      const name = `${t.profile?.title || ''} ${t.first_name} ${t.last_name}`.trim();
      const email = t.email;
      const phone = t.profile?.phone_number || '—';
      const status = t.account_status;

      let cx = 14;
      doc.text(name.substring(0, 40), cx, y); cx += colWidths[0];
      doc.text(email.substring(0, 35), cx, y); cx += colWidths[1];
      doc.text(String(phone), cx, y); cx += colWidths[2];
      doc.text(String(status), cx, y);

      y += 7;
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(14, y - 5, 182, 7, 'F');
      }
    });

    doc.save(`teachers_export_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exported successfully');
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const loadingToast = toast.loading('Reading file...');
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          
          // Convert sheet to CSV format for the backend
          const csvData = XLSX.utils.sheet_to_csv(ws);
          
          const blob = new Blob([csvData], { type: 'text/csv' });
          const formData = new FormData();
          formData.append('file', blob, 'import.csv');

          toast.loading('Importing teachers...', { id: loadingToast });
          const response = await api.post('/users/import_teachers_csv/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.dismiss(loadingToast);
          
          const { created_count, created_users, errors } = response.data;

          if (created_count > 0) {
            Swal.fire({
              icon: 'success',
              title: 'Import Successful',
              width: '90%',
              html: `
                <div class="text-left">
                  <p class="mb-4 text-sm font-bold text-emerald-600">Successfully created ${created_count} teachers!</p>
                  <div class="max-h-60 overflow-auto border border-slate-200 rounded">
                    <table class="w-full text-[10px] text-left">
                      <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th class="px-3 py-2">Name</th>
                          <th class="px-3 py-2">Email</th>
                          <th class="px-3 py-2">Temp Password</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        ${created_users.map(u => `
                          <tr>
                            <td class="px-3 py-2 font-bold">${u.name}</td>
                            <td class="px-3 py-2">${u.username}</td>
                            <td class="px-3 py-2 font-mono text-violet-600">${u.password}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                  <p class="mt-4 text-[10px] text-slate-500 italic">Please copy these credentials and provide them to the teachers.</p>
                  ${errors.length > 0 ? `
                    <div class="mt-4 p-3 bg-red-50 rounded-lg">
                      <p class="text-[10px] font-bold text-red-600 mb-1">Errors (${errors.length}):</p>
                      <ul class="text-[9px] text-red-500 list-disc list-inside">
                        ${errors.map(e => `<li>${e}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                </div>
              `,
              confirmButtonColor: '#9333ea'
            });
          } else if (errors.length > 0) {
            Swal.fire({
              icon: 'error',
              title: 'Import Failed',
              html: `
                <div class="text-left text-sm text-red-500">
                  <ul class="list-disc list-inside">${errors.map(e => `<li>${e}</li>`).join('')}</ul>
                </div>
              `
            });
          }
          
          setShowImportModal(false);
          refetch();
        } catch (err) {
          toast.dismiss(loadingToast);
          toast.error('Failed to parse Excel file');
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to read file');
    }
  };

  const getTeacherClassrooms = (teacherId) => {
    return classrooms.filter(cls => cls.teacher === teacherId);
  };

  // Rank order: principal (0) → teacher_i (last) → unknown ranks at bottom
  const RANK_ORDER = {
    'principal':                  0,
    'guidance_counselor':         1,
    'administrative_officer':     2,
    'admin_assistant':            3,
    'master_teacher_ii':          4,
    'master_teacher_i':           5,
    'special_science_teacher_i':  6,
    'teacher_vi':                 7,
    'teacher_v':                  8,
    'teacher_iv':                 9,
    'teacher_iii':               10,
    'teacher_ii':                11,
    'teacher_i':                 12,
    'als_teacher':               13,
    'registrar':                 14,
    'librarian':                 15,
    'it_staff':                  16,
    'cashier':                   17,
    'advisory':                  18,
    'teacher':                   19,
    'other':                     20,
  };

  const filteredTeachers = useMemo(() => {
    return teachers
      .filter(t => {
        const search = searchQuery.toLowerCase();
        const title = t.profile?.title || '';
        const fullName = `${title} ${t.first_name || ''} ${t.last_name || ''}`.trim().toLowerCase();
        const email = (t.email || '').toLowerCase();
        const matchesSearch = !search || email.includes(search) || fullName.includes(search);
        const matchesRole = !roleFilter || t.staff_title === roleFilter ||
          (t.additional_roles || '').split(',').filter(Boolean).includes(roleFilter);
        const matchesStatus = !statusFilter || t.account_status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        const rankA = RANK_ORDER[a.staff_title] ?? 99;
        const rankB = RANK_ORDER[b.staff_title] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        // Same rank → sort alphabetically by last name
        return (a.last_name || '').localeCompare(b.last_name || '');
      });
  }, [teachers, searchQuery, roleFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.'];

  const activeCount    = teachers.filter(t => t.account_status === 'active').length;
  const suspendedCount = teachers.filter(t => t.account_status === 'suspended').length;
  const pendingCount   = teachers.filter(t => t.must_change_password).length;
  const adviserCount   = teachers.filter(t => t.is_adviser).length;

  return (
    <div className="page-bottom-safe bg-slate-50 min-h-screen">

      {/* ── Header with live stats ── */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Faculty Management</h1>
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Staff Accounts & Assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <span className="text-lg font-black text-slate-800">{teachers.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-black text-emerald-700">{activeCount}</span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Active</span>
            </div>
            {suspendedCount > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="text-sm font-black text-rose-700">{suspendedCount}</span>
                <span className="text-[10px] font-bold text-rose-400 uppercase">Suspended</span>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-sm font-black text-amber-700">{pendingCount}</span>
                <span className="text-[10px] font-bold text-amber-500 uppercase">Pending login</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5">
              <span className="text-sm font-black text-violet-700">{adviserCount}</span>
              <span className="text-[10px] font-bold text-violet-500 uppercase">Advisers</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4 space-y-4">
        {/* ── Toolbar: search + role filter + actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search name or email…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="py-2 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-600 font-semibold">
              <option value="">All roles</option>
              {STAFF_TITLES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="py-2 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-600 font-semibold">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => { setNewTeacher({ email: '', first_name: '', last_name: '', title: '', sex: '', staff_title: 'teacher' }); setShowAddModal(true); }}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Staff
            </button>

            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 font-bold py-2 px-3 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              Import
            </button>

            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={handleExportExcel} className="px-3 py-2 text-emerald-600 hover:bg-emerald-50 transition-colors border-r border-slate-200" title="Export Excel">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
              <button onClick={handleExportPDF} className="px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors" title="Export PDF">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {(searchQuery || roleFilter || statusFilter) && (
          <p className="text-xs text-slate-400 font-semibold">
            {filteredTeachers.length} result{filteredTeachers.length !== 1 ? 's' : ''}
            {searchQuery && <> for "<span className="text-slate-600">{searchQuery}</span>"</>}
            {roleFilter && <> · <span className="text-violet-600">{STAFF_TITLES.find(t => t.value === roleFilter)?.label}</span></>}
            {statusFilter && <> · <span className="text-slate-600">{statusFilter}</span></>}
          </p>
        )}

        {filteredTeachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-12 h-12 text-violet-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-slate-400 font-semibold text-sm">No staff found</p>
            {(searchQuery || roleFilter || statusFilter) && (
              <button onClick={() => { setSearchQuery(''); setRoleFilter(''); setStatusFilter(''); }} className="mt-2 text-xs font-bold text-violet-600 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Bulk action bar */}
            {selectedIds.length > 0 && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5 flex items-center gap-3">
                <span className="text-xs font-bold text-violet-700">{selectedIds.length} selected</span>
                <button onClick={() => handleBulkStatus('active')}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded hover:bg-emerald-100 transition-colors">
                  Activate
                </button>
                <button onClick={() => handleBulkStatus('inactive')}
                  className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded hover:bg-amber-100 transition-colors">
                  Deactivate
                </button>
                <button onClick={() => handleBulkStatus('suspended')}
                  className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded hover:bg-rose-100 transition-colors">
                  Suspend
                </button>
                <button onClick={() => setSelectedIds([])}
                  className="ml-auto text-[10px] font-bold text-slate-500 hover:text-slate-700">
                  Clear
                </button>
              </div>
            )}

            {/* Select all row */}
            <div className="flex items-center gap-2 px-1">
              <button
                onClick={() => {
                  if (selectedIds.length === filteredTeachers.length) {
                    setSelectedIds([]);
                  } else {
                    setSelectedIds(filteredTeachers.map(t => t.id));
                  }
                }}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700"
              >
                <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${
                  selectedIds.length === filteredTeachers.length && filteredTeachers.length > 0
                    ? 'bg-violet-600 border-violet-600'
                    : selectedIds.length > 0
                    ? 'bg-violet-200 border-violet-400'
                    : 'border-slate-300'
                }`}>
                  {selectedIds.length === filteredTeachers.length && filteredTeachers.length > 0 ? (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : selectedIds.length > 0 ? (
                    <div className="w-2 h-0.5 bg-violet-600 rounded" />
                  ) : null}
                </div>
                Select all
              </button>
            </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredTeachers.map((teacher) => {
              const isSelected = selectedIds.includes(teacher.id);
              return (
              <div key={teacher.id} className={`bg-white border rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 group relative flex flex-col ${isSelected ? 'border-violet-400 ring-1 ring-violet-200' : 'border-slate-200'}`}>
                {/* Select checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIds(prev => isSelected ? prev.filter(id => id !== teacher.id) : [...prev, teacher.id]);
                  }}
                  className="absolute top-2 left-2 z-10"
                >
                  <div className={`w-4.5 h-4.5 border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-violet-600 border-violet-600' : 'border-white/60 bg-black/20 hover:border-white'
                  }`} style={{ width: '18px', height: '18px' }}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </div>
                </button>

                {/* ── Portrait photo ── */}
                <TeacherAvatar teacher={teacher} size="card" />

                {/* ── Info ── */}
                <div className="px-3 pt-2.5 pb-2 flex flex-col flex-1">
                  <h3 className="text-[11px] font-black text-slate-900 leading-tight uppercase tracking-wide line-clamp-2 mb-1">
                    {teacher.profile?.title} {teacher.first_name} {teacher.last_name}
                  </h3>

                  {/* Role badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded uppercase">
                      {STAFF_TITLES.find(t => t.value === teacher.staff_title)?.label || teacher.staff_title || 'Staff'}
                    </span>
                    {(teacher.additional_roles || '').split(',').filter(Boolean).map(r => (
                      <span key={r} className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded uppercase">
                        {STAFF_TITLES.find(t => t.value === r)?.label || r}
                      </span>
                    ))}
                  </div>

                  {/* Email */}
                  {teacher.email && (
                    <p className="text-[9px] text-slate-400 truncate mb-1.5">{teacher.email}</p>
                  )}

                  {/* Advisory badge */}
                  {teacher.is_adviser && (
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-[9px] font-bold text-emerald-600 uppercase truncate">
                        {getTeacherClassrooms(teacher.id).find(c => c.teacher === teacher.id)?.name || 'Advisory'}
                      </span>
                    </div>
                  )}

                  {/* Pending password warning */}
                  {teacher.must_change_password && (
                    <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded uppercase mb-1.5 self-start">
                      Temp password
                    </span>
                  )}

                  {/* Spacer to push actions to bottom */}
                  <div className="flex-1" />

                  {/* ── Action row ── */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                    {/* Quick message */}
                    {user?.id !== teacher.id && (
                      <button
                        onClick={() => handleStartChat(teacher.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        title="Message"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </button>
                    )}

                    {/* More menu */}
                    <div className="relative ml-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === teacher.id ? null : teacher.id); }}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="More actions"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>

                      {activeMenu === teacher.id && (
                        <>
                          <div className="fixed inset-0 z-[100]" onClick={() => setActiveMenu(null)} />
                          <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-slate-200 rounded-lg shadow-xl z-[110] py-1">

                            <button onClick={() => { setActiveMenu(null); setViewingTeacher(teacher); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              View Profile
                            </button>

                            <button onClick={() => { setActiveMenu(null); setEditingTeacher({ ...teacher, profile: { title: teacher.profile?.title || '', phone_number: teacher.profile?.phone_number || '', sex: teacher.profile?.sex || '' } }); setShowEditModal(true); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Edit Info
                            </button>

                            <button onClick={() => { setActiveMenu(null); handleResetPassword(teacher.id); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                              Reset Password
                            </button>

                            <button onClick={() => openRoleEditor(teacher)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              Manage Roles
                            </button>

                            <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-1.5">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Status</label>
                              <select value={teacher.account_status}
                                onChange={(e) => { setActiveMenu(null); handleToggleStatus(teacher, e.target.value); }}
                                className="w-full text-[10px] font-bold px-2 py-1 border border-slate-200 rounded bg-white focus:ring-1 focus:ring-violet-500 cursor-pointer uppercase">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                              </select>
                            </div>

                            <div className="border-t border-slate-100 mt-1 pt-1 px-2 pb-1">
                              <button onClick={() => { setActiveMenu(null); handleDelete(teacher.id); }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded text-xs font-bold text-left">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Add New Staff</h2>
                  <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">Create Staff Account</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)}
                className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddTeacher} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 sm:px-6 py-5 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                    Staff Role <span className="text-red-600">*</span>
                  </label>
                  <select required value={newTeacher.staff_title} onChange={(e) => setNewTeacher({ ...newTeacher, staff_title: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
                    {STAFF_TITLES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      Title <span className="text-red-600">*</span>
                    </label>
                    <select required value={newTeacher.title} onChange={(e) => setNewTeacher({ ...newTeacher, title: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
                      <option value="">Title</option>
                      {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      First Name <span className="text-red-600">*</span>
                    </label>
                    <input type="text" required value={newTeacher.first_name} onChange={(e) => setNewTeacher({ ...newTeacher, first_name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      Last Name <span className="text-red-600">*</span>
                    </label>
                    <input type="text" required value={newTeacher.last_name} onChange={(e) => setNewTeacher({ ...newTeacher, last_name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input type="email" required value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      Sex <span className="text-red-600">*</span>
                    </label>
                    <select required value={newTeacher.sex} onChange={(e) => setNewTeacher({ ...newTeacher, sex: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
                      <option value="">Select Sex</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 sm:px-6 py-2.5 bg-white text-gray-700 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-100 rounded-sm">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-4 sm:px-6 py-2.5 bg-[#5e2a84] text-white text-xs font-black uppercase tracking-widest hover:bg-violet-700 rounded-sm">
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Roles Modal */}
      {editingRolesId && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Manage Roles</h2>
                  <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">
                    {teachers.find(t => t.id === editingRolesId)?.first_name} {teachers.find(t => t.id === editingRolesId)?.last_name}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setEditingRolesId(null)}
                className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="px-4 sm:px-6 py-5 overflow-y-auto flex-1 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Primary Role</label>
                <select
                  value={roleForm.staff_title}
                  onChange={(e) => setRoleForm({ ...roleForm, staff_title: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                >
                  {STAFF_TITLES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Additional Roles</label>
                <p className="text-[10px] text-slate-400 mb-2">Click to toggle. Staff with multiple roles appear in multiple departments.</p>
                <div className="flex flex-wrap gap-2">
                  {STAFF_TITLES.filter(t => t.value !== roleForm.staff_title).map(t => {
                    const isActive = roleForm.additional_roles.includes(t.value);
                    return (
                      <button
                        key={t.value}
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
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => setEditingRolesId(null)}
                className="px-4 sm:px-6 py-2.5 bg-white text-gray-700 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-100 rounded-sm">
                Cancel
              </button>
              <button
                onClick={() => handleSaveRoles(editingRolesId)}
                className="px-4 sm:px-6 py-2.5 bg-[#5e2a84] text-white text-xs font-black uppercase tracking-widest hover:bg-violet-700 rounded-sm">
                Save Roles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Edit Teacher Record</h2>
                  <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">{editingTeacher.profile?.title} {editingTeacher.first_name} {editingTeacher.last_name}</p>
                </div>
              </div>              <button type="button" onClick={() => setShowEditModal(false)}
                className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditTeacher} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 sm:px-6 py-5 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      Title <span className="text-red-600">*</span>
                    </label>
                    <select required value={editingTeacher.profile?.title || ''} onChange={(e) => setEditingTeacher({ ...editingTeacher, profile: { ...editingTeacher.profile, title: e.target.value } })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
                      <option value="">Title</option>
                      {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      First Name <span className="text-red-600">*</span>
                    </label>
                    <input type="text" required value={editingTeacher.first_name} onChange={(e) => setEditingTeacher({ ...editingTeacher, first_name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      Last Name <span className="text-red-600">*</span>
                    </label>
                    <input type="text" required value={editingTeacher.last_name} onChange={(e) => setEditingTeacher({ ...editingTeacher, last_name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input type="email" required value={editingTeacher.email} onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      Sex <span className="text-red-600">*</span>
                    </label>
                    <select required value={editingTeacher.profile?.sex || ''} onChange={(e) => setEditingTeacher({ ...editingTeacher, profile: { ...editingTeacher.profile, sex: e.target.value } })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
                      <option value="">Select Sex</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="px-4 sm:px-6 py-2.5 bg-white text-gray-700 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-100 rounded-sm">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 sm:px-6 py-2.5 bg-[#5e2a84] text-white text-xs font-black uppercase tracking-widest hover:bg-violet-700 rounded-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Bulk Import Teachers</h2>
                  <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">Upload Excel or CSV</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowImportModal(false)}
                className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="px-4 sm:px-6 py-5 overflow-y-auto flex-1 space-y-5">
              <div className="border-2 border-dashed border-gray-300 rounded p-6 sm:p-10 text-center hover:border-violet-400 transition-all group relative">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleImportExcel}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-violet-50 rounded flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-700 uppercase tracking-tight">Click or drag file here</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Supports CSV, XLSX</p>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Important Note</p>
                    <p className="text-[9px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
                      Ensure your file follows the official template format to avoid errors.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => setShowImportModal(false)}
                className="px-4 sm:px-6 py-2.5 bg-white text-gray-700 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-100 rounded-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Profile Drawer */}
      {viewingTeacher && (
        <TeacherProfileDrawer
          teacher={viewingTeacher}
          classrooms={classrooms}
          onClose={() => setViewingTeacher(null)}
          onResetPassword={handleResetPassword}
          onDelete={handleDelete}
          onStartChat={handleStartChat}
          currentUser={user}
        />
      )}
    </div>
  );
};

export default Teachers;

