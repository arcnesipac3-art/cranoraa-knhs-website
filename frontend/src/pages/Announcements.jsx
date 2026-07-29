import { useState, useEffect, useCallback, useMemo } from 'react';
import api, { MEDIA_ROOT } from '../utils/api';
import apiCache from '../utils/apiCache';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useOfflineMode } from '../hooks/useBackendStatus';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useScrollLock } from '../hooks/useScrollLock';
import PostComposerModal from '../components/announcements/PostComposerModal';
import AnnouncementCommentsPanel from '../components/announcements/AnnouncementCommentsPanel';
import PostMediaCarousel from '../components/announcements/PostMediaCarousel';
import AnnouncementSidebar from '../components/announcements/AnnouncementSidebar';

const CATEGORY_CONFIG = {
  general:     { label: 'General',     color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  academic:    { label: 'Academics',   color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  events:      { label: 'Events',      color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  examinations:{ label: 'Examinations',color: 'bg-purple-50 text-purple-700 border-purple-200',dot: 'bg-purple-500' },
  guidance:    { label: 'Guidance',    color: 'bg-teal-50 text-teal-700 border-teal-200',     dot: 'bg-teal-500' },
  sports:      { label: 'Sports',      color: 'bg-orange-50 text-orange-700 border-orange-200',dot: 'bg-orange-500' },
  emergency:   { label: 'Emergency',   color: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500' },
  holiday:     { label: 'Holiday',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  system_update:{ label: 'System',     color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

const PRIORITY_CONFIG = {
  info:     { label: 'Normal',   color: 'bg-slate-100 text-slate-600 border-slate-200',   indicator: '' },
  important:{ label: 'Important',color: 'bg-orange-50 text-orange-700 border-orange-200', indicator: 'border-l-orange-500' },
  critical: { label: 'Urgent',   color: 'bg-red-50 text-red-700 border-red-200',           indicator: 'border-l-red-500' },
};

const FILTER_TABS = [
  { id: 'all',       label: 'All',        icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { id: 'unread',    label: 'Unread',     icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'pinned',    label: 'Pinned',     icon: 'M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z' },
  { id: 'urgent',    label: 'Urgent',     icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
  { id: 'academic',  label: 'Academics',  icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253' },
  { id: 'events',    label: 'Events',     icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'examinations', label: 'Exams',   icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'archived',  label: 'Archived',   icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
];

const formatFullTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

const formatFeedTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getFeedMedia = (announcement, attachUrlFn) => {
  const items = [];
  if (announcement.attachments?.length) {
    announcement.attachments.forEach((att) => {
      if (att.url) {
        items.push({
          url: attachUrlFn(att.url),
          filename: att.filename || 'File',
          is_image: att.is_image,
          file_size_bytes: att.file_size_bytes,
          content_type: att.content_type,
        });
      }
    });
  }
  if (items.length === 0 && announcement.attachment_url) {
    const url = attachUrlFn(announcement.attachment_url);
    items.push({
      url,
      filename: 'Attachment',
      is_image: /\.(jpg|jpeg|png|gif|webp)$/i.test(url),
    });
  }
  return items;
};

const getFileIcon = (filename) => {
  if (!filename) return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
  if (['doc','docx'].includes(ext)) return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
  if (['xls','xlsx'].includes(ext)) return 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
  return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const EMPTY_FORM = {
  title: '', category: 'general', priority: 'info', status: 'live',
  target_audience: 'all', target_classrooms: [], content: '', is_pinned: false, is_public: false,
  event_date: '', end_date: '', attachments: [],
};

const Announcements = () => {
  const { user } = useCurrentUser();
  const canManage = user?.role === 'admin' || user?.role === 'staff';
  const canComment = ['student', 'staff', 'admin'].includes(user?.role);
  const { isOfflineMode } = useOfflineMode();

  const [announcements, setAnnouncements] = useState([]);
  const [classrooms, setClassrooms]           = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [search, setSearch]                   = useState('');
  const [activeFilter, setActiveFilter]       = useState('all');
  const [showModal, setShowModal]             = useState(false);
  const [showView, setShowView]               = useState(false);
  const [selected, setSelected]               = useState(null);
  const [form, setForm]                       = useState(EMPTY_FORM);
  const [isEditing, setIsEditing]             = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [zoomGallery, setZoomGallery]         = useState(null);
  const [selectedIds, setSelectedIds]         = useState([]);
  const [liveCommentCount, setLiveCommentCount] = useState(0);
  const [isStaleData, setIsStaleData]         = useState(false);

  useScrollLock(showModal || showView || zoomGallery);

  useEffect(() => {
    fetchAnnouncements();
    if (canManage) fetchClassrooms();
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchAnnouncements, 400);
    return () => clearTimeout(t);
  }, [search, activeFilter]);

  const fetchClassrooms = async () => {
    try {
      const r = await api.get('/classrooms/');
      setClassrooms(r.data);
    } catch {}
  };

  const fetchAnnouncements = async () => {
    const params = {};
    if (search) params.search = search;
    if (activeFilter === 'unread') params.unread = true;
    if (activeFilter === 'pinned') params.is_pinned = true;
    if (activeFilter === 'urgent') params.priority = 'critical';
    if (activeFilter === 'academic') params.category = 'academic';
    if (activeFilter === 'events') params.category = 'events';
    if (activeFilter === 'examinations') params.category = 'examinations';
    if (activeFilter === 'archived') params.status = 'expired';

    const cacheKey = `/announcements/?${new URLSearchParams(params).toString()}`;

    // Serve from cache immediately
    const cached = apiCache.get(cacheKey);
    if (cached) {
      setAnnouncements(cached);
      setIsStaleData(false);
      setLoading(false);
    } else {
      const stale = apiCache.getStale(cacheKey);
      if (stale) {
        setAnnouncements(stale);
        setIsStaleData(true);
      }
    }

    // Fetch from network
    try {
      const r = await api.get('/announcements/', { params });
      setAnnouncements(r.data);
      setIsStaleData(false);
      apiCache.set(cacheKey, r.data, 60 * 60 * 1000);
    } catch (err) {
      if (!cached && !apiCache.getStale(cacheKey)) {
        if (err.code !== 'ERR_NETWORK') toast.error('Failed to load announcements');
      }
    } finally { setLoading(false); }
  };

  const pinned = useMemo(() => announcements.filter(a => a.is_pinned), [announcements]);
  const regular = useMemo(() => announcements.filter(a => !a.is_pinned), [announcements]);
  const sorted = useMemo(() => [...pinned, ...regular], [pinned, regular]);
  const unreadCount = useMemo(() => announcements.filter(a => !a.is_read).length, [announcements]);

  const openCreate = () => { setForm(EMPTY_FORM); setIsEditing(false); setShowModal(true); };
  const openEdit = (a) => {
    setSelected(a);
    setForm({
      title: a.title, category: a.category, priority: a.priority, status: a.status,
      target_audience: a.target_audience, target_classrooms: a.target_classrooms || [],
      content: a.content, is_pinned: a.is_pinned,
      is_public: a.is_public, event_date: a.event_date || '', end_date: a.end_date || '', attachments: [],
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return toast.error('Title and content are required');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'attachments') {
          if (v?.length) v.forEach(file => fd.append('attachments', file));
        } else if (k === 'target_classrooms') {
          if (v?.length) v.forEach(id => fd.append('target_classrooms', id));
        } else if (k === 'event_date' || k === 'end_date') {
          if (v?.trim()) fd.append(k, v);
        } else if (typeof v === 'boolean') {
          fd.append(k, v ? 'true' : 'false');
        } else if (v !== null && v !== undefined) {
          fd.append(k, v);
        }
      });
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing) {
        await api.patch(`/announcements/${selected.id}/`, fd, config);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements/', fd, config);
        toast.success('Announcement published');
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch (err) {
      const msg = err.response?.data ? Object.entries(err.response.data).map(([k, v]) => `${k}: ${v}`).join(', ') : 'Failed to save';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async (a) => {
    const result = await Swal.fire({
      title: 'Delete Announcement?', text: "This action cannot be undone.", icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Yes, delete it',
      confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl' },
    });
    if (result.isConfirmed) {
      try {
        await api.delete(`/announcements/${a.id}/`);
        setAnnouncements(prev => prev.filter(item => item.id !== a.id));
        toast.success('Deleted');
      } catch { toast.error('Failed to delete'); }
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} announcements?`, text: "This action cannot be undone.", icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Yes, delete them',
      confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl' },
    });
    if (result.isConfirmed) {
      try {
        await api.post('/announcements/bulk_delete/', { ids: selectedIds });
        setAnnouncements(prev => prev.filter(a => !selectedIds.includes(a.id)));
        setSelectedIds([]);
        toast.success('Deleted');
      } catch { toast.error('Failed'); }
    }
  };

  const handlePin = async (a) => { try { await api.patch(`/announcements/${a.id}/`, { is_pinned: !a.is_pinned }); fetchAnnouncements(); } catch {} };
  const handlePublish = async (a) => { try { await api.post(`/announcements/${a.id}/publish/`); toast.success('Published'); fetchAnnouncements(); } catch {} };
  const handleArchive = async (a) => { try { await api.post(`/announcements/${a.id}/archive/`); toast.success('Archived'); fetchAnnouncements(); } catch {} };
  const handleRead = async (a) => { try { await api.post(`/announcements/${a.id}/mark-read/`); fetchAnnouncements(); } catch {} };

  const handleDeleteAttachment = async (attId) => {
    if (!selected) return;
    try {
      await api.post(`/announcements/${selected.id}/delete-attachment/`, { attachment_id: attId });
      toast.success('Attachment removed');
      const updated = { ...selected, attachments: selected.attachments.filter(a => a.id !== attId) };
      setSelected(updated);
      setAnnouncements(prev => prev.map(a => a.id === selected.id ? updated : a));
    } catch { toast.error('Failed to remove attachment'); }
  };

  const attachUrl = (url) => url?.startsWith('http') ? url : `${MEDIA_ROOT}${url}`;

  const openImageZoom = (mediaItems, startIndex = 0) => {
    const images = mediaItems.filter(m => m.is_image).map(m => m.url);
    if (!images.length) return;
    const imageIndex = mediaItems.slice(0, startIndex + 1).filter(m => m.is_image).length - 1;
    setZoomGallery({ urls: images, index: Math.max(0, Math.min(imageIndex, images.length - 1)) });
  };

  const openPost = (a) => {
    setSelected(a);
    setLiveCommentCount(a.comment_count || 0);
    setShowView(true);
    if (!a.is_read) handleRead(a);
  };

  const handleCommentCountChange = useCallback((count) => {
    setLiveCommentCount(count);
    if (selected?.id) {
      setAnnouncements(prev => prev.map(item => item.id === selected.id ? { ...item, comment_count: count } : item));
      setSelected(s => s ? { ...s, comment_count: count } : s);
    }
  }, [selected?.id]);

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === sorted.length ? [] : sorted.map(a => a.id));

  const authorInitial = (name) => (name || 'S').charAt(0).toUpperCase();

  return (
    <div className="animate-fade-in page-bottom-safe min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b-2 border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">Announcements</h1>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  School News & Updates
                  {isStaleData && (
                    <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Cached
                    </span>
                  )}
                  {isOfflineMode && !isStaleData && (
                    <span className="ml-2 inline-flex items-center gap-1 text-red-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Offline
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                  {unreadCount} unread
                </span>
              )}
              {canManage && (
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">New Announcement</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Filters | Feed | Sidebar ── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex gap-6">

          {/* ── Left: Filter Sidebar (Desktop) ── */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                />
              </div>

              {/* Filter Tabs */}
              <nav className="bg-white rounded-xl border border-slate-200 overflow-hidden" aria-label="Announcement filters">
                {FILTER_TABS.map((tab) => {
                  const isActive = activeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors border-l-3 ${
                        isActive
                          ? 'bg-violet-50 text-violet-700 border-l-violet-600'
                          : 'text-slate-600 hover:bg-slate-50 border-l-transparent'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                      </svg>
                      {tab.label}
                      {tab.id === 'unread' && unreadCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold min-w-[18px] text-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Admin Bulk Actions */}
              {canManage && sorted.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === sorted.length && sorted.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    Select all ({sorted.length})
                  </label>
                  {selectedIds.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="w-full px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
                    >
                      Delete {selectedIds.length} selected
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* ── Mobile Search ── */}
          <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 px-4 pointer-events-none">
            <div className="max-w-lg mx-auto pointer-events-auto">
              <div className="relative shadow-lg rounded-2xl">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search announcements..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border-0 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>
          </div>

          {/* ── Mobile Filter Chips ── */}
          <div className="lg:hidden fixed top-[61px] left-0 right-0 z-20 bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto">
            <div className="flex gap-2 max-w-[1400px] mx-auto">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    activeFilter === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'unread' && unreadCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700'
                    }`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Center: Feed ── */}
          <main className="flex-1 min-w-0 max-w-[680px]">
            {/* Composer Card */}
            {canManage && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {authorInitial(user?.full_name || user?.username)}
                  </div>
                  <button
                    onClick={openCreate}
                    className="flex-1 text-left px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 text-sm font-medium transition-colors border border-slate-200"
                  >
                    Create a school announcement...
                  </button>
                </div>
                <div className="flex items-center justify-around mt-3 pt-3 border-t border-slate-100">
                  <button onClick={openCreate} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attach File
                  </button>
                  <button onClick={openCreate} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Attach Image
                  </button>
                  <button onClick={openCreate} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors">
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Schedule
                  </button>
                </div>
              </div>
            )}

            {/* Feed */}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                    <div className="flex gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-slate-200 rounded" />
                        <div className="h-2 w-20 bg-slate-100 rounded" />
                      </div>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded mb-2" />
                    <div className="h-4 w-4/5 bg-slate-100 rounded" />
                    <div className="h-40 w-full bg-slate-100 rounded-xl mt-4" />
                  </div>
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">No announcements found</h3>
                  <p className="text-sm text-slate-500 max-w-xs">
                    {activeFilter !== 'all'
                      ? 'No announcements match the current filter.'
                      : 'School announcements will appear here when published.'}
                  </p>
                  {canManage && activeFilter === 'all' && (
                    <button onClick={openCreate} className="mt-4 px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors">
                      Create first announcement
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pinned Section */}
                {pinned.length > 0 && activeFilter === 'all' && (
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pinned Announcements</span>
                    </div>
                  </div>
                )}

                {sorted.map(a => {
                  const cat = CATEGORY_CONFIG[a.category] || CATEGORY_CONFIG.general;
                  const pri = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.info;
                  const isSelected = selectedIds.includes(a.id);
                  const feedMedia = getFeedMedia(a, attachUrl);
                  const isUnread = !a.is_read;
                  const hasAttachment = (a.attachments?.length > 0) || a.attachment_url;
                  const viewCount = a.read_count || 0;

                  return (
                    <article
                      key={a.id}
                      className={`bg-white rounded-xl border overflow-hidden transition-all hover:shadow-md group ${
                        a.is_pinned ? 'border-amber-200 shadow-sm' : 'border-slate-200 shadow-sm'
                      } ${isSelected ? 'ring-2 ring-violet-400' : ''} ${pri.indicator ? `border-l-4 ${pri.indicator}` : ''} ${
                        isUnread && !a.is_pinned ? 'bg-violet-50/30' : ''
                      }`}
                    >
                      {/* Pinned Banner */}
                      {a.is_pinned && (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-100">
                          <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pinned Announcement</span>
                        </div>
                      )}

                      <div className="p-4 md:p-5">
                        {/* Header Row */}
                        <div className="flex items-start gap-3 mb-3">
                          {canManage && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(a.id)}
                              className="mt-1 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer shrink-0"
                            />
                          )}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {authorInitial(a.author_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900">{a.author_name || 'School Admin'}</span>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase px-1.5 py-0.5 bg-slate-100 rounded">
                                {(PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.info).label === 'Urgent' ? 'Admin' :
                                 a.author_role === 'staff' ? 'Faculty' : a.author_role === 'admin' ? 'Admin' : a.author_role === 'student' ? 'Student' : 'Staff'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                              <time dateTime={a.created_at}>{formatFeedTime(a.created_at)}</time>
                              <span aria-hidden="true">·</span>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${cat.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                                {cat.label}
                              </span>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-violet-600" title="Unread" />
                              )}
                            </div>
                          </div>

                          {/* Admin Actions */}
                          {canManage && (
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handlePin(a)} title={a.is_pinned ? 'Unpin' : 'Pin'}
                                className={`p-1.5 rounded-lg transition-colors ${a.is_pinned ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                </svg>
                              </button>
                              {a.status === 'draft' && (
                                <button onClick={() => handlePublish(a)} title="Publish"
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                              )}
                              {a.status === 'live' && (
                                <button onClick={() => handleArchive(a)} title="Archive"
                                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                  </svg>
                                </button>
                              )}
                              <button onClick={() => openEdit(a)} title="Edit"
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => handleDelete(a)} title="Delete"
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Badges Row */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {(a.priority === 'critical') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wide">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              Urgent
                            </span>
                          )}
                          {(a.priority === 'important') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wide">
                              Important
                            </span>
                          )}
                          {a.status === 'draft' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">Draft</span>
                          )}
                          {a.is_public && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">Public</span>
                          )}
                        </div>

                        {/* Title */}
                        <h2 className="text-base md:text-lg font-bold text-slate-900 leading-snug mb-2 cursor-pointer hover:text-violet-700 transition-colors" onClick={() => openPost(a)}>
                          {a.title}
                        </h2>

                        {/* Content Preview */}
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-3 mb-3">
                          {a.content}
                        </p>

                        {/* Media */}
                        {feedMedia.length > 0 && (
                          <div className="rounded-xl border border-slate-200 overflow-hidden mb-3">
                            <PostMediaCarousel
                              items={feedMedia}
                              onImageClick={(_, idx) => openImageZoom(feedMedia, idx)}
                            />
                          </div>
                        )}

                        {/* Attachment Cards (non-image files) */}
                        {feedMedia.filter(m => !m.is_image).length > 0 && (
                          <div className="space-y-2 mb-3">
                            {feedMedia.filter(m => !m.is_image).map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors group/att"
                              >
                                <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(att.filename)} />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate group-hover/att:text-violet-700 transition-colors">{att.filename}</p>
                                  {att.file_size_bytes && (
                                    <p className="text-[11px] text-slate-400 font-medium">{formatFileSize(att.file_size_bytes)}</p>
                                  )}
                                </div>
                                <svg className="w-4 h-4 text-slate-400 group-hover/att:text-violet-600 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Footer Stats */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {viewCount} view{viewCount === 1 ? '' : 's'}
                            </span>
                            {(a.comment_count || 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {a.comment_count}
                              </span>
                            )}
                            {hasAttachment && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {a.attachments?.length || 1}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openPost(a)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                              Read more
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>

          {/* ── Right Sidebar ── */}
          <aside className="hidden xl:block w-72 shrink-0">
            <AnnouncementSidebar announcements={announcements} />
          </aside>
        </div>
      </div>

      {/* ── Modals ── */}
      {canManage && (
        <PostComposerModal
          open={showModal}
          onClose={() => setShowModal(false)}
          form={form}
          setForm={setForm}
          isEditing={isEditing}
          saving={saving}
          onSubmit={handleSave}
          classrooms={classrooms}
          authorInitial={authorInitial(user?.full_name || user?.username)}
          existingAttachments={
            isEditing && selected?.attachments
              ? selected.attachments.map(att => ({ ...att, url: attachUrl(att.url) }))
              : []
          }
          onRemoveExistingAttachment={isEditing ? handleDeleteAttachment : undefined}
        />
      )}

      {/* ── View Modal ── */}
      {showView && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${(CATEGORY_CONFIG[selected.category] || CATEGORY_CONFIG.general).color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${(CATEGORY_CONFIG[selected.category] || CATEGORY_CONFIG.general).dot}`} />
                  {(CATEGORY_CONFIG[selected.category] || CATEGORY_CONFIG.general).label}
                </span>
                {selected.priority === 'critical' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase">Urgent</span>
                )}
                {selected.priority === 'important' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase">Important</span>
                )}
                {selected.is_pinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                    Pinned
                  </span>
                )}
              </div>
              <button onClick={() => setShowView(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">{selected.title}</h2>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {authorInitial(selected.author_name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{selected.author_name || 'Admin'}</p>
                    <p className="text-[11px] text-slate-400">{formatFullTime(selected.created_at)}</p>
                  </div>
                </div>
                {selected.event_date && (
                  <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    Event: {new Date(selected.event_date).toLocaleDateString()}
                    {selected.end_date && ` – ${new Date(selected.end_date).toLocaleDateString()}`}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-5">{selected.content}</div>

              {/* Attachments */}
              {(() => {
                const detailMedia = getFeedMedia(selected, attachUrl);
                if (detailMedia.length === 0) return null;
                return (
                  <div className="mb-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Attachments ({detailMedia.length})</p>
                    <PostMediaCarousel
                      items={detailMedia}
                      maxHeight="360px"
                      className="rounded-xl border border-slate-200 overflow-hidden"
                      onImageClick={(_, idx) => openImageZoom(detailMedia, idx)}
                    />
                    {/* Non-image attachment cards */}
                    {detailMedia.filter(m => !m.is_image).length > 0 && (
                      <div className="space-y-2 mt-3">
                        {detailMedia.filter(m => !m.is_image).map((att, idx) => (
                          <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(att.filename)} />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{att.filename}</p>
                              {att.file_size_bytes && <p className="text-[11px] text-slate-400">{formatFileSize(att.file_size_bytes)}</p>}
                            </div>
                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <AnnouncementCommentsPanel
                announcementId={selected.id}
                canComment={canComment}
                currentUserId={user?.id}
                currentUserRole={user?.role}
                initialCount={liveCommentCount}
                onCountChange={handleCommentCountChange}
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>{selected.read_count || 0} views</span>
                {(selected.comment_count || 0) > 0 && <span>{selected.comment_count} comments</span>}
              </div>
              <button onClick={() => setShowView(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Zoom ── */}
      {zoomGallery && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[110] p-4" onClick={() => setZoomGallery(null)} role="dialog" aria-modal="true">
          <button onClick={() => setZoomGallery(null)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {zoomGallery.urls.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setZoomGallery(g => ({ ...g, index: (g.index - 1 + g.urls.length) % g.urls.length })); }}
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 text-white border border-white/30 flex items-center justify-center hover:bg-white/25" aria-label="Previous">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setZoomGallery(g => ({ ...g, index: (g.index + 1) % g.urls.length })); }}
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 text-white border border-white/30 flex items-center justify-center hover:bg-white/25" aria-label="Next">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/50 text-white text-sm font-semibold">
                {zoomGallery.index + 1} / {zoomGallery.urls.length}
              </span>
            </>
          )}
           <img src={zoomGallery.urls[zoomGallery.index]} alt="" className="max-w-full max-h-full object-contain pointer-events-none" loading="lazy" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default Announcements;
