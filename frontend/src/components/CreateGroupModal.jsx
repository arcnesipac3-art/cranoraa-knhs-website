import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const SearchIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const XIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CheckIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>;
const UsersIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const CameraIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const ArrowRightIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const ArrowLeftIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const MAX_MEMBERS = 50;

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setGroupName('');
      setDescription('');
      setAvatarFile(null);
      setAvatarPreview(null);
      setSearchQuery('');
      setSelectedUsers([]);
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const [adminRes, staffRes, studentRes, parentRes] = await Promise.all([
        api.get('/users/?role=admin').catch(() => ({ data: [] })),
        api.get('/users/?role=staff').catch(() => ({ data: [] })),
        api.get('/users/?role=student').catch(() => ({ data: [] })),
        api.get('/users/?role=parent').catch(() => ({ data: [] })),
      ]);
      const all = [
        ...(adminRes.data.results || adminRes.data || []),
        ...(staffRes.data.results || staffRes.data || []),
        ...(studentRes.data.results || studentRes.data || []),
        ...(parentRes.data.results || parentRes.data || []),
      ];
      setUsers(all);
    } catch { /* ignore */ }
    setLoadingUsers(false);
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => {
      const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, searchQuery]);

  const toggleUser = useCallback((userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      if (prev.length >= MAX_MEMBERS) {
        toast.error(`Maximum ${MAX_MEMBERS} members allowed`);
        return prev;
      }
      return [...prev, userId];
    });
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Avatar must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (selectedUsers.length < 1) {
      toast.error('Select at least 1 member');
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', groupName.trim());
      formData.append('is_group', 'true');
      if (description.trim()) formData.append('description', description.trim());
      selectedUsers.forEach(id => formData.append('participants', id));
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await api.post('/chat/rooms/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Group created!');
      onGroupCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to create group');
    }
    setCreating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Create group">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Back">
                <ArrowLeftIcon size={18} className="text-slate-500" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900">{step === 1 ? 'Create Group' : 'Add Members'}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {step === 1 ? 'Set up your group details' : `${selectedUsers.length} member${selectedUsers.length !== 1 ? 's' : ''} selected`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Close">
            <XIcon size={18} className="text-slate-500" />
          </button>
        </div>

        {step === 1 ? (
          /* Step 1: Group Details */
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Avatar */}
            <div className="flex justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
                aria-label="Change group avatar"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center border-2 border-dashed border-violet-300 group-hover:border-violet-500 transition-colors">
                    <CameraIcon size={24} className="text-violet-400" />
                  </div>
                )}
                <span className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <CameraIcon size={20} className="text-white" />
                </span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Group Name */}
            <div>
              <label htmlFor="group-name" className="block text-xs font-semibold text-slate-700 mb-1.5">Group Name *</label>
              <input
                id="group-name"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. STEM Research Team"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-slate-400"
                maxLength={255}
                aria-required="true"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="group-description" className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this group about?"
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-slate-400 resize-none"
                maxLength={500}
              />
            </div>
          </div>
        ) : (
          /* Step 2: Member Selection */
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            {/* Selected Members Chips */}
            {selectedUsers.length > 0 && (
              <div className="px-5 py-2 border-b border-slate-100">
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map(userId => {
                    const user = users.find(u => u.id === userId);
                    if (!user) return null;
                    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                    return (
                      <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                        <span className="truncate max-w-[100px]">{name || user.username}</span>
                        <button onClick={() => toggleUser(userId)} className="hover:bg-violet-200 rounded-full p-0.5" aria-label={`Remove ${name}`}>
                          <XIcon size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="px-5 py-3">
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-colors placeholder-slate-400"
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto px-2">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <UsersIcon size={18} className="text-slate-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-500">{searchQuery ? 'No people found' : 'No people available'}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredUsers.map(person => {
                    const name = `${person.first_name || ''} ${person.last_name || ''}`.trim();
                    const isSelected = selectedUsers.includes(person.id);
                    return (
                      <button
                        key={person.id}
                        onClick={() => toggleUser(person.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left rounded-xl mx-1 ${isSelected ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                        style={{ width: 'calc(100% - 8px)' }}
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-label={`Select ${name}`}
                      >
                        <div className="relative flex-shrink-0">
                          {person.profile?.profile_picture ? (
                            <img src={person.profile.profile_picture} alt="" className="w-9 h-9 rounded-full object-cover" loading="lazy" />
                          ) : (
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(name)}`}>
                              {getInitials(name)}
                            </div>
                          )}
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${person.is_online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {person.role === 'admin' ? 'Admin'
                              : person.role === 'staff' ? (person.staff_title || 'Staff').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                              : person.role === 'parent' ? 'Parent'
                              : (person.profile?.classroom_name || 'Student')}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}>
                          {isSelected && <CheckIcon size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!groupName.trim()) { toast.error('Group name is required'); return; }
                  setStep(2);
                }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
              >
                Next <ArrowRightIcon size={14} />
              </button>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-400">
                {selectedUsers.length} selected
              </span>
              <button
                onClick={handleCreate}
                disabled={creating || selectedUsers.length < 1}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UsersIcon size={14} />
                )}
                Create Group
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
