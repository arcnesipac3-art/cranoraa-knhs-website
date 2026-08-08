import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import api, { WS_ROOT } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getAccessToken } from '../utils/auth';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import CreateGroupModal from '../components/CreateGroupModal';
import SettingsDrawer from '../components/SettingsDrawer';

const SearchIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const SendIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const XIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const DownloadIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const PaperclipIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>;
const LoaderIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${p.className||''}`}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>;
const CheckIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>;
const CheckCheckIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M18 7l-8 8-4-4"/><polyline points="22 7 14 17 11 14"/></svg>;
const UsersIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const MoreIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>;
const PinIcon = (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 17v5"/><path d="M9 11l-4 4h14l-4-4"/><path d="M15 3.5L9.5 9 15 11l-2.5 2.5"/></svg>;
const TrashIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
const ChatIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const ReplyIcon = (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>;
const EditIcon = (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const SmileIcon = (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const PlusIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const ChevronDownIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="6 9 12 15 18 9"/></svg>;
const SettingsIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const LockIcon = (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const BookOpenIcon = (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>;
const BuildingIcon = (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></svg>;
const MessageCircleIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>;

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '🙏', '💯', '✨', '🤔', '😍', '🥳', '😎'];

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];

function renderMessageContent(text, isOwn) {
  if (typeof text !== 'string') return null;
  const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?\]})])/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className={`underline decoration-1 underline-offset-2 break-all ${isOwn ? 'text-violet-200 hover:text-white' : 'text-violet-600 hover:text-violet-800'}`}
        >{part}</a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const MentionRegex = /@(\w+)/g;
function renderContentWithMentions(text, isOwn, allRoomMembers) {
  if (typeof text !== 'string') return null;
  const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?\]})])/g;
  const tokens = [];
  let lastIndex = 0;
  let m;
  const combined = /(?:@(?:\w+))|(?:https?:\/\/[^\s<]+[^\s<.,;:!?\]})])/g;
  while ((m = combined.exec(text)) !== null) {
    if (m.index > lastIndex) tokens.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    if (m[0].startsWith('http')) {
      tokens.push({ type: 'link', value: m[0] });
    } else {
      const username = m[0].slice(1);
      const member = allRoomMembers?.find(u => u.username === username || u.first_name?.toLowerCase() === username.toLowerCase());
      tokens.push({ type: 'mention', value: m[0], displayName: member ? `${member.first_name || ''} ${member.last_name || ''}`.trim() || username : username });
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) tokens.push({ type: 'text', value: text.slice(lastIndex) });
  return tokens.map((token, i) => {
    if (token.type === 'link') {
      return <a key={i} href={token.value} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`underline decoration-1 underline-offset-2 break-all ${isOwn ? 'text-violet-200 hover:text-white' : 'text-violet-600 hover:text-violet-800'}`}>{token.value}</a>;
    }
    if (token.type === 'mention') {
      return <span key={i} className={`font-semibold ${isOwn ? 'text-violet-200' : 'text-violet-600'}`}>{token.value}</span>;
    }
    return <span key={i}>{token.value}</span>;
  });
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function Avatar({ name, size = 'md', profilePicture }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  if (profilePicture) {
    return <img src={profilePicture} alt="" className={`${sizes[size]} rounded-full object-cover flex-shrink-0`} loading="lazy" />;
  }
  return (
    <div className={`${sizes[size]} ${getAvatarColor(name)} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`} title={name}>
      {getInitials(name)}
    </div>
  );
}

function formatChatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  if (today) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getRoomDisplayName(room, userId) {
  if (room.name) return room.name;
  if (!room.is_group && room.participants_details) {
    const other = room.participants_details.find(p => p.id !== userId);
    return other ? `${other.first_name || other.username}` : 'Chat';
  }
  if (room.participants_details) {
    return room.participants_details.map(p => p.first_name || p.username).join(', ');
  }
  return 'Chat';
}

function getRoomAvatar(room, userId) {
  if (room.avatar) return room.avatar;
  if (room.is_group) return null;
  const other = (room.participants_details || []).find(p => p.id !== userId);
  return other?.profile?.profile_picture || null;
}

function getRoomSubtitle(room) {
  if (room.last_action_type === 'message' && room.last_action_sender_name) {
    const content = room.last_action_content || '';
    return `${room.last_action_sender_name}: ${content.slice(0, 50)}${content.length > 50 ? '…' : ''}`;
  }
  if (room.last_action_type === 'unsend') return 'Message unsent';
  if (room.last_action_type === 'edit') return `${room.last_action_sender_name || 'Someone'} edited a message`;
  return '';
}

const SYSTEM_GROUP_ICONS = {
  classroom: BookOpenIcon,
  subject: BookOpenIcon,
  department: BuildingIcon,
  faculty: UsersIcon,
};

const SYSTEM_GROUP_LABELS = {
  classroom: 'Classroom',
  subject: 'Subject',
  department: 'Department',
  faculty: 'Faculty',
};

function getSystemGroupIcon(sourceType) {
  return SYSTEM_GROUP_ICONS[sourceType] || UsersIcon;
}

function getSystemGroupLabel(sourceType) {
  return SYSTEM_GROUP_LABELS[sourceType] || 'System';
}

const ROLE_GROUPS = [
  { key: 'admin', label: 'Administration', roles: ['admin'] },
  { key: 'staff', label: 'Faculty & Staff', roles: ['staff'] },
  { key: 'student', label: 'Students', roles: ['student'] },
  { key: 'parent', label: 'Parents', roles: ['parent'] },
];

const ADMIN_STAFF_TITLES = ['principal', 'guidance_counselor', 'administrative_officer', 'admin_assistant'];

function PeopleDirectory({ onSelectPerson, currentUserId, searchRef }) {
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({ admin: true, staff: true, student: true, parent: true });
  const internalSearchRef = useRef(null);
  const ref = searchRef || internalSearchRef;

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [adminRes, staffRes, studentRes, parentRes] = await Promise.all([
          api.get('/users/?role=admin').catch(() => ({ data: [] })),
          api.get('/users/?role=staff').catch(() => ({ data: [] })),
          api.get('/users/?role=student').catch(() => ({ data: [] })),
          api.get('/users/?role=parent').catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setGroups({
            admin: adminRes.data.results || adminRes.data || [],
            staff: staffRes.data.results || staffRes.data || [],
            student: studentRes.data.results || studentRes.data || [],
            parent: parentRes.data.results || parentRes.data || [],
          });
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  const displayGroups = useMemo(() => {
    const staffList = groups.staff || [];
    return {
      ...groups,
      admin: [...(groups.admin || []), ...staffList.filter(p => ADMIN_STAFF_TITLES.includes(p.staff_title))],
      staff: staffList.filter(p => !ADMIN_STAFF_TITLES.includes(p.staff_title)),
    };
  }, [groups]);

  const filtered = useMemo(() => {
    if (!peopleSearch.trim()) return displayGroups;
    const q = peopleSearch.toLowerCase();
    const result = {};
    for (const [role, list] of Object.entries(displayGroups)) {
      result[role] = (list || []).filter(p => {
        const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
        const email = (p.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    return result;
  }, [displayGroups, peopleSearch]);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
        <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight mb-3">Directory</h2>
        <div className="relative">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            ref={ref}
            type="text"
            placeholder="Search people..."
            value={peopleSearch}
            onChange={e => setPeopleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-colors"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="py-2">
            {(() => {
              const hasAnyResults = ROLE_GROUPS.some(group => (filtered[group.key] || []).length > 0);
              if (!hasAnyResults) {
                return (
                  <div className="text-center py-8 px-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <UsersIcon size={18} className="text-slate-400" />
                    </div>
                    <p className="text-xs font-medium text-slate-500">{peopleSearch ? 'No people found' : 'No people available'}</p>
                  </div>
                );
              }
              return ROLE_GROUPS.map(group => {
                const list = filtered[group.key] || [];
                if (list.length === 0) return null;
                const isExpanded = expandedGroups[group.key];
                return (
                  <div key={group.key} className="mb-1">
                    <button
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                      className="w-full flex items-center justify-between px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-50 transition-colors"
                    >
                      <span>{group.label}</span>
                      <span className="text-slate-300">{list.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-slate-50">
                        {list.map(person => (
                          <button
                            key={person.id}
                            onClick={() => onSelectPerson(person)}
                            className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-violet-50/30 transition-colors text-left"
                          >
                            <div className="relative flex-shrink-0">
                              <Avatar name={`${person.first_name || ''} ${person.last_name || ''}`} size="sm" profilePicture={person.profile?.profile_picture} />
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                person.is_online ? 'bg-emerald-400' : 'bg-slate-300'
                              }`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {person.first_name} {person.last_name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {person.role === 'admin'
                                  ? 'Admin'
                                  : person.role === 'staff'
                                    ? (person.staff_title || 'Staff').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                    : person.role === 'parent'
                                      ? 'Parent'
                                      : (person.profile?.classroom_name || 'Student')}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateSeparator(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  if (today) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function DateSeparator({ ts }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">{formatDateSeparator(ts)}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function shouldShowDateSeparator(messages, index) {
  if (index === 0) return true;
  const curr = new Date(messages[index].timestamp);
  const prev = new Date(messages[index - 1].timestamp);
  return curr.toDateString() !== prev.toDateString();
}

const ChatMessage = memo(function ChatMessage({ msg, i, chatMessages, userId, showEmojiPicker, setShowEmojiPicker, onReaction, onEdit, onDelete, onReply, onImageClick, allRoomMembers }) {
  const isOwn = msg.sender === userId;
  const showAvatar = !isOwn && (i === 0 || chatMessages[i - 1]?.sender !== msg.sender);
  const isLast = i === chatMessages.length - 1 || chatMessages[i + 1]?.sender !== msg.sender;
  const emojiOpen = showEmojiPicker === msg.id;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${!isLast ? 'mb-0.5' : 'mb-2'} chat-msg-enter`}>
      {!isOwn && <div className="w-8 flex-shrink-0">{showAvatar && (msg.sender_profile_picture ? <img src={msg.sender_profile_picture} alt="" className="w-8 h-8 rounded-full object-cover" loading="lazy" /> : <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${getAvatarColor(msg.sender_name)}`}>{getInitials(msg.sender_name)}</div>)}</div>}
      <div className={`max-w-[70%] min-w-0 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {showAvatar && !isOwn && <span className="text-[11px] font-semibold text-slate-500 mb-0.5 ml-1">{msg.sender_name}</span>}
        {msg.parent_message_details && (
          <div className={`text-[11px] px-2.5 py-1 mb-0.5 rounded-t-lg border-l-2 min-w-0 max-w-full overflow-hidden cursor-pointer hover:brightness-95 transition-all ${isOwn ? 'bg-violet-50 border-violet-400 text-violet-700' : 'bg-slate-50 border-slate-300 text-slate-600'}`}>
            <span className="font-semibold">{msg.parent_message_details.sender_name}</span>: <span className="break-all">{typeof msg.parent_message_details.content === 'string' ? msg.parent_message_details.content.slice(0, 60) : ''}</span>
          </div>
        )}
        <div className="relative group">
          {msg.message_type === 'image' && msg.attachment_url ? (
            <div className="cursor-pointer" onClick={() => onImageClick?.(msg.attachment_url, msg.attachment_filename)}>
              <img src={msg.attachment_url} alt={msg.attachment_filename} className="max-w-[280px] max-h-[200px] rounded-xl object-cover block hover:opacity-90 transition-opacity" loading="lazy" />
              {msg.content && <p className="text-sm mt-1 px-1">{renderContentWithMentions(msg.content, isOwn, allRoomMembers)}</p>}
            </div>
          ) : msg.message_type === 'file' && msg.attachment_url ? (
            <a href={msg.attachment_url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-xl border min-w-0 max-w-full overflow-hidden hover:brightness-95 transition-all ${isOwn ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-200'}`}>
              <PaperclipIcon size={16} className={isOwn ? 'text-violet-500' : 'text-slate-500'} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{msg.attachment_filename || 'File'}</p>
                <p className="text-[10px] text-slate-400">{formatFileSize(msg.file_size_bytes)}</p>
              </div>
              <DownloadIcon size={14} className="text-slate-400 flex-shrink-0" />
            </a>
          ) : (
            <div className={`px-3 py-2 rounded-2xl min-w-0 max-w-full overflow-hidden transition-shadow hover:shadow-md ${isOwn ? 'bg-violet-600 text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-md'}`}>
              <p className="text-sm whitespace-pre-wrap break-all">{renderContentWithMentions(typeof msg.content === 'string' ? msg.content : '', isOwn, allRoomMembers)}</p>
            </div>
          )}
          <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-8 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-lg px-1 py-0.5 whitespace-nowrap`}>
            <button onClick={() => setShowEmojiPicker(emojiOpen ? null : msg.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="React"><SmileIcon /></button>
            {!isOwn && <button onClick={() => onReply(msg)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="Reply"><ReplyIcon /></button>}
            {isOwn && <>
              <button onClick={() => onEdit(msg.id, msg.content)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="Edit"><EditIcon /></button>
              <button onClick={() => onDelete(msg.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete"><TrashIcon size={14} /></button>
            </>}
          </div>
          {emojiOpen && (
            <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-12 bg-white border border-slate-200 rounded-xl shadow-lg px-2 py-1 flex items-center gap-1 z-20`}>
              {EMOJI_LIST.map(emoji => (<button key={emoji} onClick={() => onReaction(msg.id, emoji)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded text-lg transition-transform hover:scale-110">{emoji}</button>))}
            </div>
          )}
        </div>
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5 ml-1">
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <button key={emoji} onClick={() => onReaction(msg.id, emoji)} className={`flex items-center gap-0.5 px-1.5 py-0.5 border rounded-full text-xs transition-all hover:scale-105 ${users.includes(userId) ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                <span>{emoji}</span><span className="text-slate-500">{users.length}</span>
              </button>
            ))}
          </div>
        )}
        {isLast && (
          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] text-slate-400">{formatChatTime(msg.timestamp)}</span>
            {isOwn && (msg.is_read ? <CheckCheckIcon size={12} className="text-violet-500" /> : msg.is_delivered ? <CheckCheckIcon size={12} className="text-slate-400" /> : <CheckIcon size={12} className="text-slate-400" />)}
            {msg.is_edited && <span className="text-[10px] text-slate-400">(edited)</span>}
          </div>
        )}
      </div>
    </div>
  );
});

export default function CommunicationCenter() {
  const { user } = useAuth();
  const userId = user?.id;
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatTypingUsers, setChatTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showRoomMenu, setShowRoomMenu] = useState(null);
  const [showPinned, setShowPinned] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [chatUploading, setChatUploading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showNewChatDropdown, setShowNewChatDropdown] = useState(false);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);
  const peopleSearchRef = useRef(null);
  const chatSocketRef = useRef(null);
  const chatReconnectTimerRef = useRef(null);
  const chatReconnectAttemptsRef = useRef(0);
  const chatTypingTimerRef = useRef(null);
  const chatLastTypingSentRef = useRef(0);
  const chatFileInputRef = useRef(null);
  const wsConnectedRef = useRef(false);
  const chatLastReadSentRef = useRef(0);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [longPressMsg, setLongPressMsg] = useState(null);
  const longPressTimerRef = useRef(null);
  const [notificationSound, setNotificationSound] = useState(true);

  const playNotificationSound = useCallback(() => {
    if (!notificationSound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* ignore */ }
  }, [notificationSound]);

  const CHAT_BASE_DELAY = 2000;
  const CHAT_MAX_DELAY = 30000;

  const connectChatWs = useCallback((roomId) => {
    if (!roomId || !userId) return;
    const token = getAccessToken();
    if (!token) return;
    if (chatSocketRef.current && chatSocketRef.current.readyState <= WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_ROOT}/ws/chat/${roomId}/`);
    chatSocketRef.current = ws;
    wsConnectedRef.current = false;
    setWsConnected(false);

    ws.onopen = () => { ws.send(JSON.stringify({ type: 'auth', token })); };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'auth_success') { wsConnectedRef.current = true; setWsConnected(true); chatReconnectAttemptsRef.current = 0; return; }
        if (data.type === 'auth_failed') { ws.close(); return; }
        if (data.type === 'message') {
          setChatMessages(prev => { if (prev.some(m => m.id === data.id)) return prev; return [...prev, data]; });
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          if (data.sender !== userId) playNotificationSound();
          return;
        }
        if (data.type === 'typing') {
          setChatTypingUsers(prev => { const next = { ...prev }; if (data.is_typing) next[data.sender_id] = data.sender_name; else delete next[data.sender_id]; return next; });
          return;
        }
        if (data.type === 'read') {
          if (data.reader_id === userId) return;
          setChatMessages(prev => { const next = prev.map(m => m.id <= data.message_id ? { ...m, is_read: true } : m); if (next === prev) return prev; return next; });
          return;
        }
        if (data.type === 'delivered') { setChatMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, is_delivered: true } : m)); return; }
        if (data.type === 'message_deleted') { setChatMessages(prev => prev.filter(m => m.id !== data.message_id)); return; }
        if (data.type === 'message_edited') { setChatMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, content: data.content, is_edited: true } : m)); return; }
        if (data.type === 'message_reaction') { setChatMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, reactions: data.reactions } : m)); return; }
        if (data.type === 'room_update') {
          if (data.event === 'group_deleted') { setChatRooms(prev => prev.filter(r => r.id !== data.room_id)); if (selectedRoom?.id === data.room_id) setSelectedRoom(null); }
          else if (data.room) { setChatRooms(prev => { const idx = prev.findIndex(r => r.id === data.room.id); let next; if (idx >= 0) { next = [...prev]; next[idx] = data.room; } else { next = [data.room, ...prev]; } next.sort((a, b) => { const ap = a.is_pinned ? 1 : 0; const bp = b.is_pinned ? 1 : 0; if (ap !== bp) return bp - ap; return new Date(b.updated_at) - new Date(a.updated_at); }); return next; }); }
          return;
        }
        if (data.type === 'forced_logout') { toast.error(data.message || 'Your account has been suspended.'); return; }
        if (data.type === 'error') { toast.error(data.message || 'An error occurred.'); return; }
      } catch { /* ignore */ }
    };

    ws.onclose = (e) => {
      wsConnectedRef.current = false;
      setWsConnected(false);
      chatSocketRef.current = null;
      if (e.code !== 1000 && e.code !== 1001 && userId) {
        if (chatReconnectTimerRef.current) clearTimeout(chatReconnectTimerRef.current);
        const attempts = chatReconnectAttemptsRef.current;
        const delay = Math.min(CHAT_BASE_DELAY * Math.pow(2, attempts), CHAT_MAX_DELAY);
        chatReconnectAttemptsRef.current = attempts + 1;
        chatReconnectTimerRef.current = setTimeout(() => connectChatWs(roomId), delay);
      }
    };
    ws.onerror = () => {};
  }, [userId]);

  const disconnectChatWs = useCallback(() => {
    if (chatReconnectTimerRef.current) { clearTimeout(chatReconnectTimerRef.current); chatReconnectTimerRef.current = null; }
    chatReconnectAttemptsRef.current = 0;
    if (chatSocketRef.current) { chatSocketRef.current.close(1000, 'Room changed'); chatSocketRef.current = null; }
    wsConnectedRef.current = false;
    setWsConnected(false);
    setChatTypingUsers({});
  }, []);

  const sendChatWs = useCallback((payload) => {
    const socket = chatSocketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const sendMessage = useCallback((content) => {
    if (!content || !selectedRoom) return;
    setReplyTo(null);
    if (!sendChatWs({ type: 'message', message: content })) {
      toast.error('Connection lost. Reconnecting...');
      connectChatWs(selectedRoom.id);
      return;
    }
    inputRef.current.value = '';
  }, [selectedRoom, sendChatWs, connectChatWs]);

  const loadChatRooms = useCallback(async () => {
    try { const r = await api.get('/chat/rooms/'); setChatRooms(r.data.results || r.data); } catch { /* ignore */ }
  }, []);

  const loadChatMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    try { const r = await api.get(`/chat/messages/?room_id=${roomId}`); setChatMessages(r.data.results || r.data); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setChatLoading(true);
    loadChatRooms().then(() => setChatLoading(false));
  }, [loadChatRooms]);

  useEffect(() => {
    if (selectedRoom) {
      disconnectChatWs();
      setChatMessages([]);
      loadChatMessages(selectedRoom.id).then(() => connectChatWs(selectedRoom.id));
    }
  }, [selectedRoom?.id, connectChatWs, disconnectChatWs, loadChatMessages]);

  useEffect(() => { return () => disconnectChatWs(); }, [disconnectChatWs]);

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === 'Escape') {
        if (mentionQuery !== null) { setMentionQuery(null); return; }
        if (showEmojiPicker) { setShowEmojiPicker(null); return; }
        if (showRoomMenu) { setShowRoomMenu(null); return; }
        if (editingMsgId) { setEditingMsgId(null); return; }
        if (showInChatSearch) { setShowInChatSearch(false); return; }
        if (replyTo) { setReplyTo(null); return; }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && selectedRoom) {
        e.preventDefault();
        setShowInChatSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [mentionQuery, showEmojiPicker, showRoomMenu, editingMsgId, showInChatSearch, replyTo, selectedRoom]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  const handleLongPressStart = useCallback((msg) => {
    longPressTimerRef.current = setTimeout(() => {
      setLongPressMsg(msg);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const roomMembers = useMemo(() => {
    if (!selectedRoom?.participants_details) return [];
    return selectedRoom.participants_details.map(p => ({
      id: p.id,
      username: p.username,
      first_name: p.first_name || '',
      last_name: p.last_name || '',
    }));
  }, [selectedRoom?.participants_details]);

  const filteredMentionUsers = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return roomMembers.filter(u => {
      if (u.id === userId) return false;
      const name = `${u.first_name} ${u.last_name}`.toLowerCase();
      return name.includes(q) || (u.username || '').toLowerCase().includes(q);
    }).slice(0, 8);
  }, [mentionQuery, roomMembers, userId]);

  const handleSelectRoom = useCallback((room) => {
    setSelectedRoom(room);
    setShowRoomMenu(null);
    setChatSearchQuery('');
    setReplyTo(null);
    setMobileView('thread');
    setEditingMsgId(null);
    setShowInChatSearch(false);
    setMentionQuery(null);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const handleInlineEditSave = useCallback(async () => {
    if (!editingMsgId || !editingContent.trim()) return;
    try {
      await api.patch(`/chat/messages/${editingMsgId}/edit/`, { content: editingContent.trim() });
      setChatMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, content: editingContent.trim(), is_edited: true } : m));
      setEditingMsgId(null);
      setEditingContent('');
    } catch { toast.error('Failed to edit'); }
  }, [editingMsgId, editingContent]);

  const handleChatUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom) return;
    setChatUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('room_id', selectedRoom.id);
      if (replyTo) formData.append('parent_id', replyTo.id);
      const r = await api.post('/chat/messages/send_media/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setChatMessages(prev => [...prev, r.data]);
      setReplyTo(null);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { toast.error('Upload failed'); }
    setChatUploading(false);
    if (chatFileInputRef.current) chatFileInputRef.current.value = '';
  }, [selectedRoom, replyTo]);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items || !selectedRoom) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const fakeEvent = { target: { files: [file] } };
          handleChatUpload(fakeEvent);
        }
        return;
      }
    }
  }, [selectedRoom, handleChatUpload]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && selectedRoom) {
      const fakeEvent = { target: { files: [file] } };
      handleChatUpload(fakeEvent);
    }
  }, [selectedRoom, handleChatUpload]);

  const handleChatKeyDown = useCallback((e) => {
    if (mentionQuery !== null && filteredMentionUsers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(prev => (prev + 1) % filteredMentionUsers.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(prev => (prev - 1 + filteredMentionUsers.length) % filteredMentionUsers.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const user = filteredMentionUsers[mentionIndex];
        if (user) {
          const val = e.target.value;
          const atIdx = val.lastIndexOf('@');
          e.target.value = val.slice(0, atIdx) + `@${user.username || user.first_name} ` + val.slice(atIdx + mentionQuery.length + 1);
          setMentionQuery(null);
        }
        return;
      }
      if (e.key === 'Escape') { setMentionQuery(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e.target.value.trim());
      e.target.value = '';
      e.target.style.height = 'auto';
    }
  }, [sendMessage, mentionQuery, filteredMentionUsers, mentionIndex]);

  const handleChatTyping = useCallback(() => {
    const now = Date.now();
    if (now - chatLastTypingSentRef.current > 3000) {
      chatLastTypingSentRef.current = now;
      sendChatWs({ type: 'typing', is_typing: true });
    }
    if (chatTypingTimerRef.current) clearTimeout(chatTypingTimerRef.current);
    chatTypingTimerRef.current = setTimeout(() => { sendChatWs({ type: 'typing', is_typing: false }); }, 3000);
  }, [sendChatWs]);

  const handleChatInput = useCallback((e) => {
    handleChatTyping();
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }, [handleChatTyping]);

  const handleChatReaction = useCallback((messageId, emoji) => {
    sendChatWs({ type: 'reaction', message_id: messageId, emoji });
    setShowEmojiPicker(null);
  }, [sendChatWs]);

  useEffect(() => {
    if (!selectedRoom || !chatMessages?.length) return;
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg && lastMsg.sender !== userId && !lastMsg.is_read && lastMsg.id !== chatLastReadSentRef.current) {
      chatLastReadSentRef.current = lastMsg.id;
      sendChatWs({ type: 'read', message_id: lastMsg.id });
    }
  }, [chatMessages, selectedRoom, userId, sendChatWs]);

  const handleCreateGroupChat = useCallback(async (name, participantIds) => {
    try {
      const r = await api.post('/chat/rooms/', { name, is_group: true, participants: participantIds });
      await loadChatRooms();
      setSelectedRoom(r.data);
    } catch { toast.error('Failed to create group'); }
  }, [loadChatRooms]);

  const handleGroupCreated = useCallback(async (room) => {
    await loadChatRooms();
    setSelectedRoom(room);
    setShowNewChatDropdown(false);
  }, [loadChatRooms]);

  const handleRoomUpdated = useCallback((updatedRoom) => {
    setChatRooms(prev => {
      const idx = prev.findIndex(r => r.id === updatedRoom.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedRoom;
        return next;
      }
      return prev;
    });
    if (selectedRoom?.id === updatedRoom.id) {
      setSelectedRoom(updatedRoom);
    }
  }, [selectedRoom?.id]);

  const handleLeaveGroup = useCallback(async (roomId) => {
    await loadChatRooms();
    setSelectedRoom(null);
  }, [loadChatRooms]);

  const handleDeleteGroup = useCallback(async (roomId) => {
    await loadChatRooms();
    setSelectedRoom(null);
  }, [loadChatRooms]);

  const handlePinRoom = useCallback(async (roomId) => {
    try {
      const room = chatRooms.find(r => r.id === roomId);
      if (room?.is_pinned) await api.post(`/chat/rooms/${roomId}/unpin/`);
      else await api.post(`/chat/rooms/${roomId}/pin/`);
      await loadChatRooms();
      setShowRoomMenu(null);
    } catch { toast.error('Failed to update pin'); }
  }, [chatRooms, loadChatRooms]);

  const handleDeleteConversation = useCallback(async (roomId) => {
    const result = await Swal.fire({ title: 'Delete conversation?', text: 'This will remove all messages for you.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#9F7AEA', cancelButtonColor: '#f43f5e', confirmButtonText: 'Delete' });
    if (result.isConfirmed) {
      try { await api.delete(`/chat/rooms/${roomId}/delete_conversation/`); await loadChatRooms(); if (selectedRoom?.id === roomId) setSelectedRoom(null); toast.success('Conversation deleted'); } catch { toast.error('Failed to delete'); }
    }
    setShowRoomMenu(null);
  }, [selectedRoom, loadChatRooms]);

  const handleDeleteChatMessage = useCallback(async (messageId) => {
    const result = await Swal.fire({ title: 'Delete message?', text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#9F7AEA', confirmButtonText: 'Delete' });
    if (result.isConfirmed) { try { await api.delete(`/chat/messages/${messageId}/`); } catch { toast.error('Failed to delete message'); } }
  }, []);

  const handleEditChatMessage = useCallback((messageId, currentContent) => {
    setEditingMsgId(messageId);
    setEditingContent(typeof currentContent === 'string' ? currentContent : '');
    setTimeout(() => {
      const el = document.querySelector(`[data-edit-input="${messageId}"]`);
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 50);
  }, []);

  const filteredChatRooms = useMemo(() => {
    let list = [...chatRooms];
    if (showPinned) list = list.filter(r => r.is_pinned);
    if (chatSearchQuery) { const q = chatSearchQuery.toLowerCase(); list = list.filter(r => getRoomDisplayName(r, userId).toLowerCase().includes(q)); }
    const pinned = list.filter(r => r.is_pinned);
    const unpinned = list.filter(r => !r.is_pinned);
    return [...pinned, ...unpinned];
  }, [chatRooms, showPinned, chatSearchQuery, userId]);

  const handleSelectPerson = async (person) => {
    try {
      const res = await api.post('/chat/rooms/get_or_create_private_chat/', { user_id: person.id });
      await loadChatRooms();
      setSelectedRoom(res.data);
      setMobileView('thread');
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || 'Failed to start conversation');
    }
  };

  return (
    <div className="h-[calc(100dvh-160px)] lg:h-[calc(100vh-100px)] min-h-0 flex bg-slate-100 overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100 - 160px)' }}>
      {/* Left Panel — Chat Rooms */}
      <div className={`
        w-full lg:w-[340px] min-w-0 bg-white lg:border-r border-slate-200 flex flex-col h-full
        ${mobileView === 'list' ? 'flex' : 'hidden lg:flex'}
      `}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="relative flex-1 mr-2">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPinned(!showPinned)}
              className={`p-2 rounded-lg transition-colors ${showPinned ? 'bg-violet-100 text-violet-600' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Pinned chats"
            >
              <PinIcon size={14} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowNewChatDropdown(!showNewChatDropdown)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-violet-600 transition-colors"
                title="New chat"
              >
                <PlusIcon size={16} />
              </button>
              {showNewChatDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNewChatDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
                    <button
                      onClick={() => { setShowNewChatDropdown(false); setShowPeoplePanel(true); setTimeout(() => peopleSearchRef.current?.focus(), 100); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <MessageCircleIcon size={14} className="text-slate-400" />
                      New Direct Message
                    </button>
                    <button
                      onClick={() => { setShowNewChatDropdown(false); setShowCreateGroup(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <UsersIcon size={14} className="text-slate-400" />
                      Create Group
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : filteredChatRooms.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ChatIcon size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1">Start a new chat to begin messaging</p>
            </div>
          ) : (
            filteredChatRooms.map(room => {
              const displayName = getRoomDisplayName(room, userId);
              const avatar = getRoomAvatar(room, userId);
              const subtitle = getRoomSubtitle(room);
              const isActive = selectedRoom?.id === room.id;
              const hasUnread = room.unread_count > 0;
              const otherUser = !room.is_group && room.participants_details?.find(p => p.id !== userId);
              const isOnline = otherUser && onlineUsers.has(otherUser.id);
              const isSystem = room.group_type === 'system' && room.source_type;
              const SystemIcon = isSystem ? getSystemGroupIcon(room.source_type) : null;

              return (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors relative ${
                    isActive ? 'bg-violet-50 border-r-2 border-violet-600' : 'hover:bg-slate-50 border-r-2 border-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="" className="w-11 h-11 rounded-full object-cover" loading="lazy" />
                    ) : room.is_group ? (
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isSystem ? 'bg-emerald-100' : 'bg-violet-100'}`}>
                        {isSystem && SystemIcon ? (
                          <SystemIcon size={18} className="text-emerald-600" />
                        ) : (
                          <UsersIcon size={20} className="text-violet-600" />
                        )}
                      </div>
                    ) : (
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(displayName)}`}>
                        {getInitials(displayName)}
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-sm truncate ${hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {displayName}
                        </span>
                        {isSystem && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold uppercase flex-shrink-0">
                            <LockIcon size={8} />
                            {getSystemGroupLabel(room.source_type)}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">
                        {formatChatTime(room.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={`text-xs truncate ${hasUnread ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
                        {subtitle || 'No messages yet'}
                      </span>
                      {hasUnread && (
                        <span className="ml-2 flex-shrink-0 w-5 h-5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {room.unread_count > 99 ? '99+' : room.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Center Panel — Message Thread */}
      <div className={`
        flex-1 flex flex-col min-w-0 bg-slate-50 h-full relative
        ${mobileView === 'thread' ? 'flex' : 'hidden lg:flex'}
      `}>
        {selectedRoom ? (
            <>
                <div className="flex items-center justify-between px-3 sm:px-5 py-3 bg-white border-b border-slate-200 min-h-[57px]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button onClick={() => { setSelectedRoom(null); setMobileView('list'); }}
                    className="p-1.5 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors lg:hidden flex-shrink-0">
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  {getRoomAvatar(selectedRoom, userId) ? (
                    <img src={getRoomAvatar(selectedRoom, userId)} alt="" className="w-9 h-9 rounded-full object-cover" loading="lazy" />
                  ) : selectedRoom.is_group ? (
                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center"><UsersIcon size={18} className="text-violet-600" /></div>
                  ) : (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs ${getAvatarColor(getRoomDisplayName(selectedRoom, userId))}`}>
                      {getInitials(getRoomDisplayName(selectedRoom, userId))}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{getRoomDisplayName(selectedRoom, userId)}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${wsConnected ? 'bg-green-500' : 'bg-amber-400'}`} />
                      {!wsConnected ? 'Connecting...' :
                        selectedRoom.is_group ? `${selectedRoom.member_count || (selectedRoom.participants_details || []).length} members` :
                          (selectedRoom.participants_details || []).find(p => p.id !== userId) && onlineUsers.has(selectedRoom.participants_details.find(p => p.id !== userId)?.id) ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowInChatSearch(prev => !prev)} className={`p-2 rounded-lg transition-colors ${showInChatSearch ? 'bg-violet-100 text-violet-600' : 'text-slate-400 hover:bg-slate-100'}`} title="Search in conversation (Ctrl+F)">
                    <SearchIcon size={16} />
                  </button>
                  {selectedRoom.is_group && (
                    <button
                      onClick={() => setShowSettingsDrawer(true)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                      title="Group settings"
                      aria-label="Group settings"
                    >
                      <SettingsIcon size={18} />
                    </button>
                  )}
                  <div className="relative">
                    <button onClick={() => setShowRoomMenu(showRoomMenu === selectedRoom.id ? null : selectedRoom.id)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                      <MoreIcon size={18} />
                    </button>
                    {showRoomMenu === selectedRoom.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
                        <button onClick={() => handlePinRoom(selectedRoom.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <PinIcon size={14} />{selectedRoom.is_pinned ? 'Unpin chat' : 'Pin chat'}
                        </button>
                        <button onClick={() => setNotificationSound(prev => !prev)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <span className="text-sm">{notificationSound ? '🔊' : '🔇'}</span>Sound {notificationSound ? 'on' : 'off'}
                        </button>
                        {!selectedRoom.is_group && (
                          <button onClick={() => handleDeleteConversation(selectedRoom.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                            <TrashIcon size={14} />Delete conversation
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" onClick={() => { setShowRoomMenu(null); setLongPressMsg(null); }}
                ref={messagesContainerRef}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              >
                {isDragging && (
                  <div className="absolute inset-0 bg-violet-50/90 border-2 border-dashed border-violet-400 rounded-xl z-30 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <PaperclipIcon size={24} className="text-violet-500" />
                      </div>
                      <p className="text-sm font-semibold text-violet-700">Drop file to send</p>
                    </div>
                  </div>
                )}
                {showInChatSearch && (
                  <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 mb-2 flex items-center gap-2 shadow-sm">
                    <SearchIcon size={14} className="text-slate-400" />
                    <input autoFocus type="text" placeholder="Search in conversation..." value={inChatSearchQuery} onChange={e => setInChatSearchQuery(e.target.value)}
                      className="flex-1 text-xs bg-transparent focus:outline-none placeholder-slate-400" />
                    <button onClick={() => { setShowInChatSearch(false); setInChatSearchQuery(''); }} className="text-slate-400 hover:text-slate-600"><XIcon size={14} /></button>
                  </div>
                )}
                {(!chatMessages || chatMessages.length === 0) ? (
                  <div className="flex items-center justify-center h-full"><p className="text-sm text-slate-400">No messages yet. Say hello!</p></div>
                ) : (
                  chatMessages
                    .filter(msg => !inChatSearchQuery || (typeof msg.content === 'string' && msg.content.toLowerCase().includes(inChatSearchQuery.toLowerCase())))
                    .map((msg, i) => (
                    <div key={msg.id}
                      onTouchStart={() => handleLongPressStart(msg)} onTouchEnd={handleLongPressEnd} onTouchCancel={handleLongPressEnd}
                      onMouseDown={() => handleLongPressStart(msg)} onMouseUp={handleLongPressEnd} onMouseLeave={handleLongPressEnd}
                    >
                      {shouldShowDateSeparator(chatMessages, chatMessages.indexOf(msg)) && <DateSeparator ts={msg.timestamp} />}
                      {editingMsgId === msg.id ? (
                        <div className={`flex ${msg.sender === userId ? 'justify-end' : 'justify-start'} mb-2`}>
                          <div className={`max-w-[80%] min-w-0 px-3 py-2 rounded-xl border-2 border-violet-400 bg-white shadow-lg`}>
                            <textarea data-edit-input={msg.id} value={editingContent} onChange={e => setEditingContent(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInlineEditSave(); } if (e.key === 'Escape') setEditingMsgId(null); }}
                              className="w-full text-sm bg-transparent focus:outline-none resize-none" rows={2} />
                            <div className="flex justify-end gap-1 mt-1">
                              <button onClick={() => setEditingMsgId(null)} className="px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                              <button onClick={handleInlineEditSave} className="px-2 py-0.5 text-[10px] text-white bg-violet-600 hover:bg-violet-700 rounded">Save</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <ChatMessage
                          key={msg.id}
                          msg={msg}
                          i={chatMessages.indexOf(msg)}
                          chatMessages={chatMessages}
                          userId={userId}
                          showEmojiPicker={showEmojiPicker}
                          setShowEmojiPicker={setShowEmojiPicker}
                          onReaction={handleChatReaction}
                          onEdit={handleEditChatMessage}
                          onDelete={handleDeleteChatMessage}
                          onReply={setReplyTo}
                          onImageClick={(url) => setLightboxImage(url)}
                          allRoomMembers={roomMembers}
                        />
                      )}
                    </div>
                  ))
                )}
                {Object.keys(chatTypingUsers).length > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-slate-400">{Object.values(chatTypingUsers).join(', ')} {Object.keys(chatTypingUsers).length === 1 ? 'is' : 'are'} typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {replyTo && (
                <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 border-t border-violet-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-violet-600">Replying to {replyTo.sender_name}</p>
                    <p className="text-xs text-slate-600 truncate">{typeof replyTo.content === 'string' ? replyTo.content : ''}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-violet-400 hover:text-violet-600"><XIcon size={14} /></button>
                </div>
              )}

              <div className="px-4 py-3 border-t border-slate-200 bg-white relative">
                {chatUploading && (
                  <div className="flex items-center gap-2 px-4 py-2 mb-2 bg-violet-50 border border-violet-200 rounded-xl text-violet-700">
                    <LoaderIcon size={14} className="text-violet-600" />
                    <span className="text-xs font-semibold">Uploading file...</span>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input type="file" ref={chatFileInputRef} onChange={handleChatUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
                  <button onClick={() => chatFileInputRef.current?.click()} disabled={chatUploading} className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-50" title="Attach file">
                    {chatUploading ? <LoaderIcon size={18} className="text-violet-500" /> : <PaperclipIcon size={18} />}
                  </button>
                  <div className="flex-1 relative">
                    {mentionQuery !== null && filteredMentionUsers.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 max-h-48 overflow-y-auto">
                        {filteredMentionUsers.map((u, idx) => (
                          <button key={u.id} onClick={() => {
                            const el = inputRef.current; if (!el) return;
                            const val = el.value; const atIdx = val.lastIndexOf('@');
                            el.value = val.slice(0, atIdx) + `@${u.username || u.first_name} ` + val.slice(atIdx + mentionQuery.length + 1);
                            setMentionQuery(null); el.focus();
                          }} className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${idx === mentionIndex ? 'bg-violet-50 text-violet-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                            <Avatar name={`${u.first_name} ${u.last_name}`} size="sm" />
                            <span className="font-medium truncate">{u.first_name} {u.last_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      ref={inputRef}
                      data-chat-input
                      placeholder={chatUploading ? "Uploading file..." : editingMsgId ? "Edit message..." : "Type a message..."}
                      rows={1}
                      onKeyDown={handleChatKeyDown}
                      onInput={handleChatInput}
                      onPaste={handlePaste}
                      disabled={chatUploading}
                      className="w-full px-4 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent pr-12 resize-none max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <button
                    onClick={() => { const v = inputRef.current?.value?.trim(); if (v) { sendMessage(v); inputRef.current.value = ''; inputRef.current.style.height = 'auto'; } }}
                    disabled={chatUploading}
                    className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send message"
                  >
                    <SendIcon size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChatIcon size={32} className="text-violet-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Select a conversation</h3>
              <p className="text-sm text-slate-500 mt-1">Choose from existing chats or start a new one</p>
            </div>
          )
        }
      </div>

      {/* Right Panel — People Directory */}
      <div className={`
        ${showPeoplePanel ? 'fixed inset-0 z-50 bg-white lg:relative lg:inset-auto lg:z-auto' : 'hidden lg:flex'}
        w-full lg:w-[300px] min-w-0 border-l border-slate-200 h-full
      `}>
        {showPeoplePanel && (
          <button onClick={() => setShowPeoplePanel(false)} className="absolute top-3 right-3 p-2 rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden z-10">
            <XIcon size={18} />
          </button>
        )}
        <PeopleDirectory onSelectPerson={(p) => { handleSelectPerson(p); setShowPeoplePanel(false); }} currentUserId={user?.id} searchRef={peopleSearchRef} />
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={handleGroupCreated}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={showSettingsDrawer}
        onClose={() => setShowSettingsDrawer(false)}
        room={selectedRoom}
        userId={userId}
        onRoomUpdated={handleRoomUpdated}
        onLeave={handleLeaveGroup}
        onDelete={handleDeleteGroup}
      />

      {/* Scroll to Bottom FAB */}
      {showScrollBtn && selectedRoom && (
        <button onClick={() => scrollToBottom(true)}
          className="fixed bottom-28 right-8 w-10 h-10 bg-violet-600 text-white rounded-full shadow-lg hover:bg-violet-700 transition-all z-40 flex items-center justify-center animate-bounce-in lg:flex hidden"
          title="Scroll to bottom"
        >
          <ChevronDownIcon size={20} />
        </button>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 text-white/80 hover:text-white z-10">
            <XIcon size={28} />
          </button>
          <img src={lightboxImage} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Long-Press Context Menu (Mobile) */}
      {longPressMsg && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setLongPressMsg(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[91] bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl p-2 lg:hidden animate-slide-up">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
            {longPressMsg.parent_message_details && (
              <div className="px-3 py-2 mb-1 rounded-lg bg-slate-50 border-l-2 border-slate-300">
                <p className="text-[10px] font-semibold text-slate-500">{longPressMsg.parent_message_details.sender_name}</p>
                <p className="text-xs text-slate-600 truncate">{typeof longPressMsg.parent_message_details.content === 'string' ? longPressMsg.parent_message_details.content : ''}</p>
              </div>
            )}
            <button onClick={() => { setShowEmojiPicker(longPressMsg.id); setLongPressMsg(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-xl">
              <SmileIcon size={18} /> React
            </button>
            {longPressMsg.sender !== userId && (
              <button onClick={() => { setReplyTo(longPressMsg); setLongPressMsg(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-xl">
                <ReplyIcon size={18} /> Reply
              </button>
            )}
            {longPressMsg.sender === userId && (
              <>
                <button onClick={() => { handleEditChatMessage(longPressMsg.id, longPressMsg.content); setLongPressMsg(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-xl">
                  <EditIcon size={18} /> Edit
                </button>
                <button onClick={() => { handleDeleteChatMessage(longPressMsg.id); setLongPressMsg(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl">
                  <TrashIcon size={18} /> Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
