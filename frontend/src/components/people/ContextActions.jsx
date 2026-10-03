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

export default function ContextActions({
  user,
  type, // 'teacher' | 'student' | 'parent'
  onEdit,
  onDelete,
  onResetPassword,
  onViewProfile,
  onAssignSection,
  onManageRoles,
  onLinkChildren,
  onToggleStatus,
  onStartChat,
  canEdit = true,
  canDelete = true,
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
            {user.id && (
              <button 
                onClick={() => { setShowMenu(false); handleStartChat(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                Message
              </button>
            )}

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
                onClick={() => { setShowMenu(false); onAssignSection(user.id, user.profile?.classroom_name, user.profile?.grade_level); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Set Section
              </button>
            )}

            {type === 'parent' && onLinkChildren && (
              <button 
                onClick={() => { setShowMenu(false); onLinkChildren(user); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Link Children
              </button>
            )}

            {onViewProfile && (
              <button 
                onClick={() => { setShowMenu(false); onViewProfile(user); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Profile
              </button>
            )}

            {onStartChat && user.id && (
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

            {extraActions && extraActions.map((action, idx) => (
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
  );
}
