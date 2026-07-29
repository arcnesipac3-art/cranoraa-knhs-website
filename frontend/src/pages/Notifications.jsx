import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useNotifications } from '../context/NotificationContext';
import { usePushNotificationContext } from '../context/PushNotificationContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifConfig, formatNotifTime, TYPE_CONFIG } from '../utils/notificationConfig';
import { LoadingSpinner, EmptyState } from '../components/ui';

// ── Notification type labels ─────────────────────────────────────────────────
const TYPE_LABELS = {
  announcement: 'Announcements',
  grade: 'Grade Updates',
  attendance: 'Attendance',
  fee: 'Fee Reminders',
  message: 'Messages',
  system: 'System Alerts',
};

// ── Type config (local badge/dot colours, extends shared config) ──────────────
const TYPE_BADGE = {
  announcement: { label: 'Announcement', dot: 'bg-violet-500' },
  grade:        { label: 'Grade',        dot: 'bg-emerald-500' },
  attendance:   { label: 'Attendance',   dot: 'bg-amber-500' },
  fee:          { label: 'Fee',          dot: 'bg-red-500' },
  system:       { label: 'System',       dot: 'bg-indigo-500' },
  message:      { label: 'Message',      dot: 'bg-violet-500' },
};
const getTypeConfig = (type) => TYPE_BADGE[type] || { label: type, dot: 'bg-slate-400' };

// ── Notification row icon (uses shared config) ────────────────────────────────
const NotifIcon = ({ type }) => {
  const cfg = getNotifConfig(type);
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cfg.icon} />
      </svg>
    </div>
  );
};

// Use shared formatNotifTime — no local duplicate
const formatTime = formatNotifTime;

// ─────────────────────────────────────────────────────────────────────────────

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setUnreadCount, unreadCount } = useNotifications();
  const { permission, requestPermission, isSupported } = usePushNotificationContext();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [totalCount, setTotalCount]       = useState(0);
  const [selectedIds, setSelectedIds]     = useState([]);
  const [processing, setProcessing]       = useState(false);

  // Notification preferences
  const [showPrefs, setShowPrefs]         = useState(false);
  const [prefs, setPrefs]                 = useState(null);
  const [prefsLoading, setPrefsLoading]   = useState(false);
  const [prefsSaving, setPrefsSaving]     = useState(false);

  const PAGE_SIZE = 20;

  useEffect(() => { fetchNotifications(); }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchNotifications();
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPreferences = async () => {
    setPrefsLoading(true);
    try {
      const r = await api.get('/notification-preferences/');
      setPrefs(r.data);
    } catch {
      toast.error('Failed to load notification preferences');
    } finally {
      setPrefsLoading(false);
    }
  };

  const savePreferences = async (updated) => {
    setPrefsSaving(true);
    try {
      const r = await api.put('/notification-preferences/', updated);
      setPrefs(r.data);
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setPrefsSaving(false);
    }
  };

  const togglePref = async (key) => {
    if (!prefs) return;
    if (key === 'push_enabled' && !prefs[key]) {
      if (!isSupported) {
        toast.error('Push notifications are not supported in this browser');
        return;
      }
      if (permission === 'denied') {
        toast.error('Notification permission was denied. Please reset it in browser settings.');
        return;
      }
      const result = await requestPermission();
      if (result !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }
    }
    savePreferences({ ...prefs, [key]: !prefs[key] });
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const r = await api.get('/notifications/', {
        params: {
          search,
          notification_type: typeFilter || undefined,
          is_read: statusFilter === 'all' ? undefined : statusFilter === 'read',
          page,
          page_size: PAGE_SIZE,
        },
      });
      const data = r.data;
      setNotifications(Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []));
      const count = data.count || 0;
      setTotalCount(count);
      setTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    } catch {
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? notifications.map(n => n.id) : []);
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const markRead = async (id) => {
    try {
      const r = await api.post(`/notifications/${id}/mark-read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      // Server returns unread_count — no extra round-trip needed
      if (r.data.unread_count !== undefined) setUnreadCount(r.data.unread_count);
    } catch { toast.error('Failed to mark as read'); }
  };

  const markSelectedRead = async () => {
    if (!selectedIds.length) return;
    try {
      const r = await api.post('/notifications/mark-selected-read/', { ids: selectedIds });
      setNotifications(prev =>
        prev.map(n => selectedIds.includes(n.id) ? { ...n, is_read: true } : n)
      );
      setSelectedIds([]);
      if (r.data.unread_count !== undefined) setUnreadCount(r.data.unread_count);
      toast.success(`${selectedIds.length} marked as read`);
    } catch { toast.error('Failed to mark as read'); }
  };

  const markAllRead = async () => {
    const result = await Swal.fire({
      title: 'Mark all as read?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, mark all read',
      confirmButtonColor: '#7c3aed',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    setProcessing(true);
    try {
      await api.post('/notifications/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to mark all as read'); }
    finally { setProcessing(false); }
  };

  const handleDelete = async (id) => {
    try {
      const r = await api.delete(`/notifications/${id}/`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
      toast.success('Notification deleted');
      if (r.data.unread_count !== undefined) setUnreadCount(r.data.unread_count);
    } catch { toast.error('Failed to delete notification'); }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const result = await Swal.fire({
      title: 'Delete selected?',
      text: "This cannot be undone",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#ef4444',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    setProcessing(true);
    try {
      const r = await api.delete('/notifications/bulk-delete/', { data: { ids: selectedIds } });
      setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
      setTotalCount(prev => Math.max(0, prev - selectedIds.length));
      setSelectedIds([]);
      if (r.data.unread_count !== undefined) setUnreadCount(r.data.unread_count);
      toast.success('Selected notifications deleted');
    } catch { toast.error('Failed to delete notifications'); }
    finally { setProcessing(false); }
  };

  const handleTestPush = async () => {
    setProcessing(true);
    try {
      await api.post('/test-push/');
      toast.success('Test push sent! Check your corner in 2-3s.');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to send test push';
      toast.error(errorMsg);
      console.error('Test push error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const unreadInView = notifications.filter(n => !n.is_read).length;
  const allSelected  = notifications.length > 0 && selectedIds.length === notifications.length;
  const hasUnread    = unreadCount > 0; // use global count, not just current page

  return (
    <div className="space-y-5 animate-fade-in page-bottom-safe">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount > 0 ? `${totalCount} total` : 'Your activity feed'}
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black uppercase tracking-wider">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {user?.role === 'admin' && (
            <button
              onClick={handleTestPush}
              disabled={processing || loading}
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-violet-600 text-xs sm:text-sm font-bold text-white hover:bg-violet-700 transition-all disabled:opacity-40 shadow-sm min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Send Test
            </button>
          )}
          <button
            onClick={markAllRead}
            disabled={processing || loading || !hasUnread}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm min-h-[44px]"
          >
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Mark all read
          </button>
          <button
            onClick={() => {
              const next = !showPrefs;
              setShowPrefs(next);
              if (next && !prefs) fetchPreferences();
            }}
            title="Notification Preferences"
            className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border transition-all shadow-sm ${showPrefs ? 'bg-violet-50 border-violet-300 text-violet-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Notification Preferences Panel ── */}
      {showPrefs && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Notification Preferences</h2>
            {prefsSaving && <span className="text-xs text-violet-500 font-medium">Saving...</span>}
          </div>

          {prefsLoading ? (
            <div className="flex items-center justify-center py-8"><LoadingSpinner /></div>
          ) : prefs ? (
            <>
              {/* Delivery channels */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Channels</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {[
                    { key: 'push_enabled', label: 'Push Notifications', desc: 'Browser push via FCM' },
                    { key: 'in_app_enabled', label: 'In-App Bell', desc: 'Show in notification dropdown' },
                  ].map(({ key, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => togglePref(key)}
                      disabled={prefsSaving}
                      className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${prefs[key] ? 'bg-violet-50 border-violet-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}
                    >
                      <div className={`w-10 h-6 rounded-full flex items-center transition-all ${prefs[key] ? 'bg-violet-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                        <div className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{label}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-type toggles */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notification Types</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => togglePref(key)}
                      disabled={prefsSaving}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${prefs[key] ? 'bg-white border-violet-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${key === 'announcement' ? 'bg-violet-500' : key === 'grade' ? 'bg-emerald-500' : key === 'attendance' ? 'bg-amber-500' : key === 'fee' ? 'bg-red-500' : key === 'message' ? 'bg-blue-500' : 'bg-indigo-500'}`} />
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                      </div>
                      <div className={`w-9 h-5 rounded-full flex items-center transition-all ${prefs[key] ? 'bg-violet-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm mx-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Failed to load preferences</p>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search notifications…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 focus:bg-white transition-all"
            />
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          >
            <option value="">All Types</option>
            <option value="announcement">Announcements</option>
            <option value="grade">Grades</option>
            <option value="attendance">Attendance</option>
            <option value="message">Messages</option>
            <option value="fee">Fees</option>
            <option value="system">System</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>

        {/* Bulk actions bar */}
        {selectedIds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 animate-fade-in flex-wrap">
            <span className="text-xs font-bold text-slate-600">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={markSelectedRead}
                disabled={processing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs font-bold hover:bg-violet-100 transition-all disabled:opacity-40"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Mark read
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={processing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-40"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Notification List ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Table header (desktop) */}
        <div className="hidden md:flex items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer no-min">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
            />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {allSelected ? 'Deselect all' : 'Select all'}
            </span>
          </label>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
            title="All caught up"
            message="No notifications match your current filters."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const cfg       = getTypeConfig(n.notification_type);
              const isSelected = selectedIds.includes(n.id);

              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors group
                    ${!n.is_read ? 'bg-violet-50/30' : 'hover:bg-slate-50'}
                    ${isSelected ? 'bg-violet-50' : ''}`}
                >
                  {/* Checkbox */}
                  <label className="flex-shrink-0 mt-0.5 cursor-pointer no-min">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectOne(n.id)}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                  </label>

                  {/* Icon */}
                  <NotifIcon type={n.notification_type} />

                  {/* Content */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => { if (n.link) navigate(n.link); if (!n.is_read) markRead(n.id); }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`ui-badge ${cfg.badge}`}>{cfg.label}</span>
                        {!n.is_read && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-black uppercase tracking-wider">
                            New
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 flex-shrink-0 uppercase tracking-wider">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p className={`text-sm leading-snug mb-0.5 ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                  </div>

                  {/* Actions — always visible on touch, hover-reveal on desktop */}
                  <div className="flex items-center gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!n.is_read && (
                      <button
                        onClick={() => markRead(n.id)}
                        title="Mark as read"
                        className="p-2 rounded-lg text-violet-500 hover:bg-violet-50 transition-all no-min"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      title="Delete"
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all no-min"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
