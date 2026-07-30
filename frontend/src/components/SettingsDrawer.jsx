import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const XIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const UsersIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const ImageIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const FileIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>;
const PinIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 17v5"/><path d="M9 11l-4 4h14l-4-4"/><path d="M15 3.5L9.5 9 15 11l-2.5 2.5"/></svg>;
const BellOffIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M13.73 21a2 2 0 01-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0118 8"/><path d="M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 00-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const LogOutIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const TrashIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
const EditIcon = (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const ShieldIcon = (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const CrownIcon = (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><line x1="5" y1="20" x2="19" y2="20"/></svg>;

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatTimeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const TABS = [
  { key: 'members', label: 'Members', icon: UsersIcon },
  { key: 'media', label: 'Media', icon: ImageIcon },
  { key: 'files', label: 'Files', icon: FileIcon },
  { key: 'pinned', label: 'Pinned', icon: PinIcon },
];

export default function SettingsDrawer({ isOpen, onClose, room, userId, onRoomUpdated, onLeave, onDelete }) {
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [mediaMessages, setMediaMessages] = useState([]);
  const [fileMessages, setFileMessages] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const nameInputRef = useRef(null);
  const descInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const isOwner = room?.owner === userId;
  const isAdmin = members.some(m => m.user === userId && (m.role === 'owner' || m.role === 'admin'));
  const canManage = isOwner || isAdmin;
  const isSystem = room?.group_type === 'system';

  useEffect(() => {
    if (isOpen && room?.is_group) {
      loadMembers();
      setActiveTab('members');
    }
  }, [isOpen, room?.id]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await api.get(`/chat/rooms/${room.id}/members/`);
      setMembers(res.data);
    } catch { /* ignore */ }
    setLoadingMembers(false);
  };

  const loadTabContent = async (tab) => {
    if (!room) return;
    setLoadingContent(true);
    try {
      if (tab === 'media') {
        const res = await api.get(`/chat/rooms/${room.id}/media/`);
        setMediaMessages(res.data);
      } else if (tab === 'files') {
        const res = await api.get(`/chat/rooms/${room.id}/files/`);
        setFileMessages(res.data);
      } else if (tab === 'pinned') {
        const res = await api.get(`/chat/messages/pinned/?room_id=${room.id}`);
        setPinnedMessages(res.data);
      }
    } catch { /* ignore */ }
    setLoadingContent(false);
  };

  useEffect(() => {
    if (isOpen) loadTabContent(activeTab);
  }, [activeTab, isOpen]);

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await api.patch(`/chat/rooms/${room.id}/rename/`, { name: newName.trim() });
      onRoomUpdated({ ...room, name: newName.trim() });
      setEditingName(false);
      toast.success('Group renamed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to rename');
    }
  };

  const handleUpdateDescription = async () => {
    try {
      await api.patch(`/chat/rooms/${room.id}/update_description/`, { description: newDesc.trim() });
      onRoomUpdated({ ...room, description: newDesc.trim() });
      setEditingDesc(false);
      toast.success('Description updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar must be less than 5MB');
      return;
    }
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await api.post(`/chat/rooms/${room.id}/change_avatar/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onRoomUpdated(res.data);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload avatar');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToggleMute = async () => {
    try {
      const res = await api.post(`/chat/rooms/${room.id}/toggle_mute/`);
      setMembers(prev => prev.map(m =>
        m.user === userId ? { ...m, muted: res.data.muted } : m
      ));
      toast.success(res.data.muted ? 'Notifications muted' : 'Notifications unmuted');
    } catch { toast.error('Failed'); }
  };

  const handleRemoveMember = async (memberUserId) => {
    const result = await Swal.fire({
      title: 'Remove member?',
      text: 'They will no longer be able to send messages in this group.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#9F7AEA',
      confirmButtonText: 'Remove',
    });
    if (!result.isConfirmed) return;
    try {
      await api.post(`/chat/rooms/${room.id}/remove_participant/`, { user_id: memberUserId });
      setMembers(prev => prev.filter(m => m.user !== memberUserId));
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove');
    }
  };

  const handleLeave = async () => {
    const result = await Swal.fire({
      title: 'Leave group?',
      text: 'You will no longer be able to send messages in this group.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#9F7AEA',
      confirmButtonText: 'Leave',
    });
    if (!result.isConfirmed) return;
    try {
      await api.post(`/chat/rooms/${room.id}/leave_group/`);
      onLeave(room.id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to leave');
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete group?',
      text: 'This will permanently delete the group and all messages.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/chat/rooms/${room.id}/delete_group/`);
      onDelete(room.id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleUpdateRole = async (memberUserId, newRole) => {
    try {
      await api.patch(`/chat/rooms/${room.id}/members/`, { user_id: memberUserId, role: newRole });
      setMembers(prev => prev.map(m =>
        m.user === memberUserId ? { ...m, role: newRole } : m
      ));
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const myMember = members.find(m => m.user === userId);
  const isMuted = myMember?.muted;

  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Group settings">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-slide-in-right" style={{ animation: 'slideInRight 0.2s ease-out' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Group Info</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Close">
            <XIcon size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Group Info */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              {room.avatar ? (
                <img src={room.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
                  <UsersIcon size={24} className="text-violet-600" />
                </div>
              )}
              {canManage && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                    aria-label="Change avatar"
                  >
                    <EditIcon size={14} className="text-white" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
                    className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    autoFocus
                  />
                  <button onClick={handleRename} className="p-1 text-violet-600 hover:bg-violet-50 rounded" aria-label="Save">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-bold text-slate-800 truncate">{room.name || 'Unnamed Group'}</h3>
              {canManage && !isSystem && (
                    <button onClick={() => { setNewName(room.name || ''); setEditingName(true); }} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" aria-label="Edit name">
                      <EditIcon size={12} />
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-0.5">{members.length} members</p>
            </div>
          </div>

          {/* Description */}
          {editingDesc ? (
            <div className="mt-3">
              <textarea
                ref={descInputRef}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdateDescription(); } if (e.key === 'Escape') setEditingDesc(false); }}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                rows={2}
                autoFocus
                disabled={isSystem}
              />
              {!isSystem && (
                <div className="flex gap-1 mt-1">
                  <button onClick={handleUpdateDescription} className="px-2 py-1 text-xs font-medium text-white bg-violet-600 rounded-lg">Save</button>
                  <button onClick={() => setEditingDesc(false)} className="px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                </div>
              )}
            </div>
          ) : room.description && canManage && !isSystem ? (
            <p className="text-xs text-slate-500 mt-2 cursor-pointer hover:text-slate-700" onClick={() => { setNewDesc(room.description || ''); setEditingDesc(true); }}>
              {room.description}
            </p>
          ) : room.description ? (
            <p className="text-xs text-slate-500 mt-2">{room.description}</p>
          ) : canManage && !isSystem ? (
            <button onClick={() => { setNewDesc(room.description || ''); setEditingDesc(true); }} className="text-xs text-slate-400 mt-2 hover:text-violet-600 transition-colors">
              + Add description
            </button>
          ) : null}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors relative ${
                activeTab === tab.key ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label={tab.label}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
              {activeTab === tab.key && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-600 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'members' && (
            <div className="py-2">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No members found</p>
              ) : (
                members.map(member => (
                  <div key={member.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="relative flex-shrink-0">
                      {member.user_profile_picture ? (
                        <img src={member.user_profile_picture} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(member.user_name)}`}>
                          {getInitials(member.user_name)}
                        </div>
                      )}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${member.is_online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {member.nickname ? `${member.nickname} (${member.user_name})` : member.user_name}
                        </p>
                        {member.role === 'owner' && <CrownIcon size={12} className="text-amber-500 flex-shrink-0" />}
                        {member.role === 'admin' && <ShieldIcon size={12} className="text-violet-500 flex-shrink-0" />}
                        {member.muted && <BellOffIcon size={12} className="text-slate-400 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {member.user_role === 'admin' ? 'Admin'
                          : member.user_role === 'staff' ? (member.user_staff_title || 'Staff').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                          : member.user_role === 'parent' ? 'Parent'
                          : 'Student'}
                        {member.user === userId && ' (You)'}
                      </p>
                    </div>
                    {member.user === userId ? (
                      <button onClick={handleToggleMute} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                        <BellOffIcon size={14} className={isMuted ? 'text-red-500' : ''} />
                      </button>
                    ) : canManage && (
                      <div className="flex items-center gap-0.5">
                        {isOwner && member.role !== 'owner' && (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.user, e.target.value)}
                            className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                        {isOwner && member.role !== 'owner' && (
                          <button onClick={() => handleRemoveMember(member.user)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label="Remove member">
                            <TrashIcon size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {(activeTab === 'media' || activeTab === 'files' || activeTab === 'pinned') && (
            <div className="py-2">
              {loadingContent ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {activeTab === 'pinned' && pinnedMessages.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-8">No pinned messages</p>
                  )}
                  {activeTab === 'media' && mediaMessages.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-8">No media shared yet</p>
                  )}
                  {activeTab === 'files' && fileMessages.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-8">No files shared yet</p>
                  )}
                  {(activeTab === 'pinned' ? pinnedMessages : activeTab === 'media' ? mediaMessages : fileMessages).map(msg => (
                    <div key={msg.id} className="px-5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-700">{msg.sender_name}</span>
                        <span className="text-[10px] text-slate-400">{formatTimeAgo(msg.timestamp)}</span>
                      </div>
                      {msg.message_type === 'image' && msg.attachment_url ? (
                        <img src={msg.attachment_url} alt="" className="max-w-full rounded-lg object-cover max-h-32" />
                      ) : msg.message_type === 'file' && msg.attachment_url ? (
                        <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-xs text-slate-600 hover:bg-slate-200 transition-colors">
                          <FileIcon size={14} />
                          <span className="truncate">{msg.attachment_filename || 'File'}</span>
                        </a>
                      ) : (
                        <p className="text-sm text-slate-600 truncate">{msg.content}</p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-2">
          {!isOwner && (
            <button
              onClick={handleLeave}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              <LogOutIcon size={16} /> Leave Group
            </button>
          )}
          {isOwner && (
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              <TrashIcon size={16} /> Delete Group
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
