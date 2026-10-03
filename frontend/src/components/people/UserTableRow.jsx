import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  inactive: 'text-slate-500 bg-slate-50 border-slate-200',
  suspended: 'text-rose-600 bg-rose-50 border-rose-200',
};

export default function UserTableRow({
  user,
  type, // 'teacher' | 'student' | 'parent'
  onEdit,
  onDelete,
  onResetPassword,
  onViewProfile,
  onAssignSection,
  onManageRoles,
  onToggleStatus,
  onStartChat,
  canEdit = true,
  canDelete = true,
  showTempPassword = false,
  extraActions = [],
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: `Delete ${type.charAt(0).toUpperCase() + type.slice(1)}?`,
      text: `This will permanently remove the ${type} account.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!',
    });
    if (result.isConfirmed && onDelete) {
      await onDelete(user.id, user);
    }
    setShowMenu(false);
  };

  const handleStartChat = async () => {
    try {
      await api.post('/chat/rooms/get_or_create_private_chat/', { user_id: user.id });
      navigate('/communication-center');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open chat');
    }
    setShowMenu(false);
  };

  const handleResetPassword = async () => {
    const { value: password } = await Swal.fire({
      title: 'Reset Password',
      input: 'text',
      inputLabel: 'New temporary password (leave blank to auto-generate)',
      inputPlaceholder: 'Optional',
      showCancelButton: true,
      confirmButtonText: 'Reset',
      confirmButtonColor: '#f59e0b',
    });
    if (password !== undefined) {
      try {
        const response = await api.post(`/users/${user.id}/reset_password/`, { password });
        Swal.fire({
          icon: 'success',
          title: 'Password Reset',
          html: `New temporary password: <strong>${response.data.temporary_password}</strong><br/>The user will be forced to change it on login.`,
        });
      } catch {
        toast.error('Failed to reset password');
      }
    }
    setShowMenu(false);
  };

  const handleToggleStatus = async (newStatus) => {
    try {
      const response = await api.post(`/users/${user.id}/update_status/`, { status: newStatus });
      toast.success(response.data.status);
      if (onToggleStatus) onToggleStatus(user.id, newStatus);
    } catch {
      toast.error('Failed to update status');
    }
    setShowMenu(false);
  };

  const statusColor = STATUS_COLORS[user.account_status] || STATUS_COLORS.inactive;
  const displayName = user.profile?.title 
    ? `${user.profile.title} ${user.first_name} ${user.last_name}`
    : `${user.first_name} ${user.last_name}`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow group relative overflow-visible min-w-0">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-800 leading-tight truncate">{displayName}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[9px] font-bold tracking-wide border px-2 py-0.5 rounded ${statusColor}`}>
              {user.account_status}
            </span>
            {user.role === 'staff' && (
              <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                {user.staff_title || 'Teacher'}
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all"
            aria-label="More actions"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 shadow-lg rounded-md z-50 py-1">
                {canEdit && onEdit && (
                  <button 
                    onClick={() => { setShowMenu(false); onEdit(user); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}

                {type === 'teacher' && onManageRoles && (
                  <button 
                    onClick={() => { setShowMenu(false); onManageRoles(user); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Roles
                  </button>
                )}

                {type === 'student' && onAssignSection && (
                  <button 
                    onClick={() => { onAssignSection(user.id, user.profile?.classroom_name, user.profile?.grade_level); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Set Section
                  </button>
                )}

                {type === 'parent' && (
                  <button 
                    onClick={() => { /* handled by parent component */ setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Link Children
                  </button>
                )}

                {type !== 'parent' && onStartChat && user.id && (
                  <button 
                    onClick={() => { setShowMenu(false); handleStartChat(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Message
                  </button>
                )}

                <button 
                  onClick={() => { setShowMenu(false); handleResetPassword(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Reset Password
                </button>

                <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-2">
                  <label className="text-[9px] font-bold text-slate-400 tracking-wide mb-1 block">Status</label>
                  <select 
                    value={user.account_status} 
                    onChange={(e) => handleToggleStatus(e.target.value)}
                    className="w-full text-xs font-bold px-2 py-1.5 border border-slate-200 rounded bg-white focus:ring-1 focus:ring-violet-500 cursor-pointer tracking-wide"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {extraActions.map((action, idx) => (
                  <button 
                    key={idx}
                    onClick={() => { setShowMenu(false); action.onClick(user); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}

                <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-2">
                  <button 
                    onClick={() => { setShowMenu(false); handleDelete(); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 text-red-600 hover:bg-red-50 rounded transition-colors text-left"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="text-xs font-bold">Delete</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1 mb-2">
        <div className="flex items-center text-slate-600 min-w-0">
          <svg className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-[9px] md:text-xs font-medium truncate">{user.email || '—'}</span>
        </div>

        {user.profile?.phone_number && (
          <div className="flex items-center text-slate-600 min-w-0">
            <svg className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-[9px] md:text-xs font-medium">{user.profile.phone_number}</span>
          </div>
        )}

        <div className="flex items-center text-slate-600 min-w-0">
          <svg className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[9px] md:text-xs font-medium text-slate-500">{user.profile?.sex || 'N/A'}</span>
        </div>

        {showTempPassword && user.must_change_password && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-[8px] font-bold text-amber-600">Temp:</span>
            <span className="text-[9px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 border border-amber-200 select-all cursor-help" title="Visible until user changes password">
              {user.temp_password_storage || 'Pending'}
            </span>
          </div>
        )}
      </div>

      {type === 'teacher' && user.is_adviser && (
        <div className="mt-2 flex items-center gap-1.5">
          <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[9px] font-bold text-emerald-600">
            Advisory
          </span>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[9px] font-bold text-slate-400 tracking-[0.1em]">Classes</p>
          <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
            {user.classroom_count || 0}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {user.classrooms && user.classrooms.length > 0 ? (
            user.classrooms.map(cls => (
              <span key={cls.id} className={`px-1.5 py-0.5 text-[9px] font-medium border rounded ${
                cls.teacher === user.id
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-100'
              }`}>
                {cls.name}
              </span>
            ))
          ) : (
            <p className="text-[9px] text-slate-300 italic">No assignments</p>
          )}
        </div>
      </div>
    </div>
  );
}
