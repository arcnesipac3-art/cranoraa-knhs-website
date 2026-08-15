import { Fragment } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../utils/api';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { getMuted, toggleMute, playSound } from '../utils/sounds';
import { SkipLink, Breadcrumb, SearchBar } from './navigation';
import { generateBreadcrumbs } from '../utils/breadcrumbs';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

import { getNotifConfig, formatNotifTime } from '../utils/notificationConfig';


const NavItem = ({ to, label, isActive, icon, onClick, href, external, iconMode, isPinned, onTogglePin }) => {
  if (external && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={`flex items-center ${iconMode ? 'justify-center px-0 py-1.5' : 'px-2.5 py-1.5'} rounded-md transition-all duration-150 mb-[1px] text-[11px] group text-purple-200/80 hover:bg-white/5 hover:text-white font-semibold relative`}
        title={iconMode ? label : undefined}
      >
        <svg
          className={`${iconMode ? '' : 'w-3.5 h-3.5 mr-2'} w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 text-purple-400/70`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
        {!iconMode && (
          <>
            <span className="truncate">{label}</span>
            <svg className="w-2.5 h-2.5 ml-1 text-purple-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </>
        )}
      </a>
    );
  }
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive(to) ? 'page' : undefined}
      title={iconMode ? label : undefined}
      className={`flex items-center ${iconMode ? 'justify-center px-0 py-1.5' : 'px-2.5 py-1.5'} rounded-md transition-all duration-150 mb-[1px] text-[11px] group relative ${
        isActive(to)
          ? 'bg-gradient-to-r from-violet-500/90 to-purple-500/90 text-white font-bold shadow-lg shadow-purple-900/30 ring-1 ring-white/10'
          : 'text-purple-200/80 hover:bg-white/5 hover:text-white font-semibold'
      }`}
    >
      <svg
        className={`${iconMode ? '' : 'w-3.5 h-3.5 mr-2'} w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${isActive(to) ? 'text-white' : 'text-purple-400/70'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
      {!iconMode && <span className="truncate">{label}</span>}
      {!iconMode && onTogglePin && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(to); }}
          className={`ml-auto flex-shrink-0 p-px rounded transition-all duration-150 ${isPinned ? 'text-amber-400 opacity-100' : 'text-purple-400/30 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}
          title={isPinned ? 'Unpin' : 'Pin to Quick Access'}
        >
          <svg className="w-2.5 h-2.5" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      )}
    </Link>
  );
};

const SectionLabel = ({ label, collapsed, onToggle }) => (
  <button
    onClick={onToggle}
    className="mt-2 mb-0.5 px-2.5 first:mt-0 flex items-center justify-between w-full group/section cursor-pointer select-none rounded-md hover:bg-white/5 transition-colors duration-150"
  >
    <p className="text-[10px] font-extrabold text-purple-400/60 uppercase tracking-widest group-hover/section:text-purple-300/80 transition-colors duration-150">{label}</p>
    <svg
      className={`w-3 h-3 text-purple-400/40 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/section:text-purple-300/60 ${collapsed ? '' : 'rotate-90'}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  </button>
);

// ── Mute toggle button ────────────────────────────────────────────────────────
const MuteButton = () => {
  const [muted, setMuted] = useState(getMuted());
  const handleToggle = () => {
    const nowMuted = toggleMute();
    setMuted(nowMuted);
    toast(nowMuted ? '🔇 Sounds muted' : '🔔 Sounds on', { duration: 1500 });
  };
  return (
    <button
      onClick={handleToggle}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? (
        /* Speaker off */
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      ) : (
        /* Speaker on */
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )}
    </button>
  );
};

// ── PWA Install instructions fallback ───────────────────────────────────────
const showInstallInstructions = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);

  let steps = '';
  if (isIOS) {
    steps = `
      <p style="margin-bottom:6px"><b>1.</b> Tap the <b>Share</b> icon <span style="font-size:16px">&#8593;</span> at the bottom</p>
      <p style="margin-bottom:6px"><b>2.</b> Scroll down and tap <b>Add to Home Screen</b></p>
      <p><b>3.</b> Tap <b>Add</b> to install</p>
    `;
  } else if (isAndroid && isChrome) {
    steps = `
      <p style="margin-bottom:6px"><b>1.</b> Tap the <b>&#8942;</b> (three dots) menu at the top right</p>
      <p style="margin-bottom:6px"><b>2.</b> Tap <b>Install app</b> or <b>Add to Home screen</b></p>
      <p><b>3.</b> Tap <b>Install</b> to confirm</p>
    `;
  } else {
    steps = `
      <p style="margin-bottom:6px"><b>1.</b> Open your browser's <b>menu</b></p>
      <p style="margin-bottom:6px"><b>2.</b> Look for <b>Install app</b>, <b>Add to Home screen</b>, or <b>Install</b></p>
      <p><b>3.</b> Confirm the installation</p>
    `;
  }

  Swal.fire({
    title: 'Install KNHS Portal',
    html: `
      <div style="text-align:left;font-size:13px;line-height:1.7;color:#475569">
        <p style="margin-bottom:10px">Add the portal to your home screen for quick access and offline support:</p>
        ${steps}
      </div>
    `,
    icon: 'info',
    confirmButtonText: 'Got it',
    confirmButtonColor: '#7c3aed',
    background: '#ffffff',
    customClass: {
      popup: 'rounded-2xl border border-slate-100 shadow-2xl',
      confirmButton: 'rounded-xl font-bold uppercase tracking-widest text-xs px-6 py-3'
    }
  });
};

// ── PWA Install Button (header) ─────────────────────────────────────────────
const HeaderDownloadButton = () => {
  const { canInstall, isInstalled, isDismissed, install } = useInstallPrompt();
  const [installing, setInstalling] = useState(false);

  if (isInstalled || isDismissed) return null;

  const handleInstall = async () => {
    playSound('click');
    if (canInstall) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
      return;
    }
    showInstallInstructions();
  };

  return (
    <button
      onClick={handleInstall}
      disabled={installing}
      title="Download App"
      aria-label="Download app"
      className="flex items-center gap-2 rounded-xl px-2.5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-violet-600/25 border border-violet-400/30 sm:px-3"
    >
      {installing ? (
        <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
      <span className="hidden md:inline truncate">{installing ? 'Installing...' : 'Download App'}</span>
    </button>
  );
};

// ── PWA Install Button (sidebar) ─────────────────────────────────────────────

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { notifications, setNotifications, unreadCount, setUnreadCount, realtimeConnected, isPolling } = useNotifications();
  const { academicYear } = useActiveAcademicYear();
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);
  const [sysSettings, setSysSettings] = useState(null);
  const [notifDropdownPos, setNotifDropdownPos] = useState({ top: 0, right: 0 });
  const [userMenuPos, setUserMenuPos] = useState({ top: 0, right: 0 });

  // Collapsible sidebar sections — persisted per role in localStorage
  const [collapsedSections, setCollapsedSections] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const toggleSection = (role, idx) => {
    setCollapsedSections(prev => {
      const next = { ...prev };
      const key = `${role}_${idx}`;
      next[key] = !next[key];
      try { localStorage.setItem('sidebar_collapsed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Icon-only sidebar mode (collapsed to icons)
  const [iconMode, setIconMode] = useState(() => {
    try { return localStorage.getItem('sidebar_icon_mode') === 'true'; } catch { return false; }
  });
  const toggleIconMode = () => {
    setIconMode(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_icon_mode', String(next)); } catch {}
      return next;
    });
  };

  // Portal mode for dual-role users (admin vs teacher)
  const isDualRole = user?.role === 'staff' && (user?.is_admin || user?.is_superuser);
  const [portalMode, setPortalMode] = useState(() => {
    try {
      const saved = localStorage.getItem('portal_mode');
      if (saved === 'admin' || saved === 'teacher') return saved;
    } catch {}
    return 'admin';
  });
  const togglePortalMode = () => {
    setPortalMode(prev => {
      const next = prev === 'admin' ? 'teacher' : 'admin';
      try { localStorage.setItem('portal_mode', next); } catch {}
      return next;
    });
  };

  // Pinned favorites — persisted per role
  const [pinnedItems, setPinnedItems] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_pinned');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const togglePinned = (path) => {
    setPinnedItems(prev => {
      const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
      try { localStorage.setItem('sidebar_pinned', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Sidebar search filter
  const [sidebarSearch, setSidebarSearch] = useState('');
  const notifDropdownRef = useRef(null);
  const notifBtnRef = useRef(null);
  const userMenuRef = useRef(null);
  const userBtnRef = useRef(null);
  const mobileUserMenuRef = useRef(null);

  // Re-fetch system settings on navigation so academic year stays current
  useEffect(() => {
    api.get('/system/settings/').then(r => setSysSettings(r.data)).catch(() => {});
  }, [location.pathname]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // C6: Set --vh CSS variable for accurate mobile viewport height
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
    return () => window.removeEventListener('resize', setVH);
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifications]);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  // Close mobile user menu on outside click
  useEffect(() => {
    if (!showMobileUserMenu) return;
    const handler = (e) => {
      if (mobileUserMenuRef.current && !mobileUserMenuRef.current.contains(e.target)) {
        setShowMobileUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMobileUserMenu]);

  const normalizePath = (path) => path.split('?')[0];
  const isActive = (path) => location.pathname === normalizePath(path);
  const homePath = user?.role === 'parent' ? '/parent-dashboard' : '/dashboard';
  const isHomeActive = isActive(homePath);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Listen for notification clicks from the service worker (background push)
  // and navigate to the correct page inside the SPA.
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.link) {
        navigate(event.data.link);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [navigate]);

  const handleLogout = async () => {
    playSound('click');
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out of your account",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#9F7AEA',
      cancelButtonColor: '#f43f5e',
      confirmButtonText: 'Yes, logout!',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-2xl border border-slate-100 shadow-2xl',
        confirmButton: 'rounded-xl font-bold uppercase tracking-widest text-xs px-6 py-3',
        cancelButton: 'rounded-xl font-bold uppercase tracking-widest text-xs px-6 py-3'
      }
    });

    if (result.isConfirmed) {
      await signOut();
      navigate('/login');
      toast.success('Logged out successfully');
    }
  };

  const markAllAsRead = async () => {
    playSound('click');
    try {
      await api.post('/notifications/mark-all-read/');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const markAsRead = async (id) => {
    playSound('click');
    try {
      const r = await api.post(`/notifications/${id}/mark-read/`);
      // Use the count returned by the server — no extra round-trip needed
      if (r.data.unread_count !== undefined) setUnreadCount(r.data.unread_count);
      else setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  // Use shared utility — no local duplicate
  const formatTime = formatNotifTime;

  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/enrollment') return 'Enrollment';
    if (path === '/classes') return 'Classes';
    if (path === '/people') return 'People';
    if (path === '/subjects') return 'Subjects';
    if (path === '/schedules') return 'Schedules';
    if (path === '/my-classes') return 'My Classes';
    if (path === '/my-schedule') return 'My Schedule';
    if (path === '/system-admin') return 'System Admin Hub';
    if (path === '/communication-center') return 'Communication Center';
    if (path === '/notifications') return 'Notifications';
    if (path === '/portal-calendar') return 'Calendar';
    if (path === '/analytics') return 'Analytics';
    if (path === '/system-health') return 'System Health';
    if (path === '/grade-input') return 'Grade Input';
    if (path === '/grade-management') return 'Grade Management';
    if (path === '/attendance-monitoring') return 'Attendance Monitoring';
    if (path === '/attendance-dashboard') return 'Attendance Dashboard';
    if (path === '/student-attendance') return 'My Attendance';
    if (path === '/excuse-slips') return 'Excuse Slips';
    if (path === '/attendance-audit-trail') return 'Attendance Audit Trail';
    if (path === '/academic-setup') return 'Academic Setup';
    if (path === '/teachers') return 'Teachers';
    if (path === '/student-management') return 'Students';
    if (path === '/moderation') return 'Moderation';
    if (path === '/enrollment-management') return 'Enrollment';
    if (path === '/academic-setup') return 'Academic Setup';
    if (path === '/audit-logs') return 'Audit Logs';
    if (path === '/backups') return 'Backups';
    if (path === '/website-content') return 'Website Editor';
    if (path === '/settings') return 'Settings';
    if (path === '/settings') return 'My Profile';
    if (path === '/password-reset') return 'Change Password';
    if (path === '/schedule-management') return 'Schedules';
    if (path === '/parent-dashboard') return 'Parent Dashboard';
    if (path === '/parent-management') return 'Parents';
    return 'Portal';
  }, [location.pathname]);

  const hubTabs = useMemo(() => {
    const path = location.pathname;
    const tab = new URLSearchParams(location.search).get('tab');
    const allTabs = {
      '/system-admin': [
        { id: 'audit-logs', label: 'Audit Logs', roles: ['admin'] },
        { id: 'backups', label: 'Backups', roles: ['admin'] },
        { id: 'website-editor', label: 'Website Editor', roles: ['admin'] },
        { id: 'moderation', label: 'Moderation', roles: ['admin'] },
        { id: 'system-health', label: 'System Health', roles: ['admin'] }
      ],
    };
    const tabs = allTabs[path];
    if (!tabs) return null;
    const visibleTabs = tabs.filter(t => t.roles.includes(user?.role));
    if (!visibleTabs.length) return null;
    const firstTab = visibleTabs[0];
    return {
      tabs: visibleTabs,
      isActive: (id) => tab === id || (!tab && id === firstTab.id)
    };
  }, [location.pathname, location.search, user?.role]);

  const isCommunicationTabActive = (tab) => hubTabs?.isActive?.(tab) || false;

  // Generate breadcrumbs from current location
  const breadcrumbItems = useMemo(() => {
    return generateBreadcrumbs(location.pathname, user?.role || 'student');
  }, [location.pathname, user?.role]);

  // Generate search suggestions based on user role
  const searchSuggestions = useMemo(() => {
    const baseSuggestions = [
      { label: 'Dashboard', path: '/dashboard', category: 'General', description: 'Your personal dashboard' },
      { label: 'Notifications', path: '/notifications', category: 'Communication', description: 'View all notifications' },
      { label: 'Calendar', path: '/portal-calendar', category: 'Communication', description: 'School calendar and events' },
      { label: 'Announcements', path: '/announcements', category: 'Communication', description: 'School announcements' },
      { label: 'My Profile', path: '/settings', category: 'Account', description: 'View and edit your profile' },
      { label: 'Settings', path: '/settings', category: 'Account', description: 'Account settings' },
    ];

    const roleSuggestions = {
      student: [
        { label: 'My Classes', path: '/my-classes', category: 'Academics', description: 'View your classes' },
        { label: 'My Schedule', path: '/my-schedule', category: 'Academics', description: 'Your class schedule' },
      ],
      staff: [
        { label: 'My Classes', path: '/my-classes', category: 'Teaching', description: 'Your assigned classes' },
        { label: 'My Schedule', path: '/my-schedule', category: 'Teaching', description: 'View your schedule' },
        { label: 'Grades', path: '/grade-input', category: 'Teaching', description: 'Input and manage student grades' },
        { label: 'Enrollment', path: '/enrollment?tab=applications', category: 'Management', description: 'Enrollment applications' },
        { label: 'Schedules', path: '/schedules', category: 'Management', description: 'Manage schedules' },
        { label: 'Students', path: '/people?tab=students', category: 'Directory', description: 'Student directory' },
        { label: 'Announcements', path: '/announcements', category: 'Communication', description: 'Post announcements' },
      ],
      admin: [
        { label: 'Academic Setup', path: '/academic-setup', category: 'Management', description: 'Set up academic year' },
        { label: 'Subjects', path: '/subjects', category: 'Management', description: 'Manage curriculum subjects' },
        { label: 'Schedules', path: '/schedules', category: 'Management', description: 'Manage schedules' },
        { label: 'Enrollment', path: '/enrollment?tab=applications', category: 'Management', description: 'Enrollment applications' },
        { label: 'Enroll Students', path: '/enrollment?tab=enroll-students', category: 'Management', description: 'Enroll students' },
        { label: 'Class Sections', path: '/classes', category: 'Management', description: 'Manage class sections' },
        { label: 'Subject Assignments', path: '/subjects?tab=assignments', category: 'Management', description: 'Assign subjects to sections' },
        { label: 'Teachers', path: '/people?tab=teachers', category: 'Directory', description: 'Teacher directory' },
        { label: 'Students', path: '/people?tab=students', category: 'Directory', description: 'Student directory' },
        { label: 'Parents', path: '/people?tab=parents', category: 'Directory', description: 'Parent directory' },
        { label: 'Audit Logs', path: '/system-admin?tab=audit-logs', category: 'System', description: 'System audit logs' },
        { label: 'Backups', path: '/system-admin?tab=backups', category: 'System', description: 'System backups' },
        { label: 'Website Editor', path: '/system-admin?tab=website-editor', category: 'System', description: 'Edit website content' },
      ],
      parent: [
        { label: 'My Children', path: '/parent-dashboard', category: 'Family', description: 'Dashboard for your children' },
        { label: 'Change Password', path: '/password-reset', category: 'Account', description: 'Update your password' },
      ]
    };

    return [...baseSuggestions, ...(roleSuggestions[user?.role] || [])];
  }, [user?.role]);

  const NAV_STRUCTURE = useMemo(() => ({
    staff: [
      {
        header: 'Workspaces',
        items: [
          { to: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { to: '/my-classes', label: 'My Classes', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
          { to: '/my-schedule', label: 'My Schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        ]
      },
      {
        header: 'Teaching',
        items: [
          { to: '/teacher-grade-dashboard', label: 'Grade Submission', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { to: '/attendance-dashboard', label: 'Attendance Dashboard', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
          { to: '/excuse-slips', label: 'Excuse Slips', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { to: '/my-compliance', label: 'My Compliance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2m-2 4h6m-6 4h6m-3-8v4m0 0v4m0-4h4m-4 0H8' },
        ]
      },
      {
        header: 'Communication',
        items: [
          { to: '/communication-center', label: 'Messages', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
          { to: '/announcements', label: 'Announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
          { to: '/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
        ]
      },
      {
        header: 'Directory',
        items: [
          { to: '/people', label: 'People Directory', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        ]
      },
      {
        header: 'Resources',
        items: [
          { to: '/enrollment', label: 'Enrollment', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
          { to: '/schedules', label: 'Schedules', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { to: '/portal-calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        ]
      },
      {
        header: 'Account',
        items: [
          { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
          { to: '/help', label: 'Help Center', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        ]
      }
    ],
    admin: [
      {
        header: 'General',
        items: [
          { to: '/system-admin', label: 'Admin Hub', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { to: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        ]
      },
      {
        header: 'Academics',
        items: [
          { to: '/academic-setup', label: 'Academic Setup', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2m6-4h6' },
          { to: '/grade-management', label: 'Grade Management', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { to: '/classes', label: 'Classes', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
          { to: '/subjects', label: 'Subjects', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.747 0-3.332-.477-4.5-1.253' },
        ]
      },
      {
        header: 'Attendance',
        items: [
          { to: '/attendance-monitoring', label: 'Monitoring', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
          { to: '/excuse-slips', label: 'Excuse Slips', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { to: '/attendance-audit-trail', label: 'Audit Trail', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2m-2 4h6m-6 4h6m-3-8v4m0 0v4m0-4h4m-4 0H8' },
        ]
      },
      {
        header: 'Operations',
        items: [
          { to: '/enrollment', label: 'Enrollment', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
          { to: '/schedules', label: 'Schedules', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { to: '/compliance', label: 'Compliance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2m-2 4h6m-6 4h6m-3-8v4m0 0v4m0-4h4m-4 0H8' },
          { to: '/announcements', label: 'Announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
        ]
      },
      {
        header: 'Communication',
        items: [
          { to: '/communication-center', label: 'Messages', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
          { to: '/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
          { to: '/portal-calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        ]
      },
      {
        header: 'People',
        items: [
          { to: '/people', label: 'People Directory', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        ]
      },
      {
        header: 'System',
        items: [
          { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
          { to: '/help', label: 'Help Center', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        ]
      }
    ],
    student: [
      {
        header: 'Workspaces',
        items: [
          { to: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { to: '/my-classes', label: 'My Classes', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
          { to: '/my-schedule', label: 'My Schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { to: '/student-attendance', label: 'My Attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
          { to: '/communication-center', label: 'Communication Center', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
        ]
      },
      {
        header: 'School Life',
        items: [
          { to: '/portal-calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { to: '/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
          { to: '/announcements', label: 'Announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
          { to: '/people', label: 'People Directory', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        ]
      },
      {
        header: 'Account',
        items: [
          { to: '/settings', label: 'My Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
          { to: '/help', label: 'Help Center', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },

        ]
      }
    ],
    parent: [
      {
        header: 'My Children',
        items: [
          { to: '/parent-dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { to: '/student-attendance', label: 'Attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
          { to: '/communication-center', label: 'Communication Center', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
          { to: '/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
          { to: '/announcements', label: 'Announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
          { to: '/portal-calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { to: '/people', label: 'People Directory', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        ]
      },
      {
        header: 'Account',
        items: [
          { to: '/settings', label: 'My Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { to: '/password-reset', label: 'Change Password', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
          { to: '/help', label: 'Help Center', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },

        ]
      }
    ]
  }), [user?.role, user?.is_adviser]);

  const currentNav = NAV_STRUCTURE[(isDualRole && portalMode === 'admin') ? 'admin' : user?.role] || [];

  // Flatten all nav items for search/pin lookups
  const allNavItems = useMemo(() => currentNav.flatMap(s => s.items), [currentNav]);
  const findItemByPath = (path) => allNavItems.find(i => i.to === path);

  // Filter nav by search
  const filteredNav = useMemo(() => {
    if (!sidebarSearch.trim()) return currentNav;
    const q = sidebarSearch.toLowerCase();
    return currentNav.map(s => ({
      ...s,
      items: s.items.filter(i => i.label.toLowerCase().includes(q)),
    })).filter(s => s.items.length > 0);
  }, [currentNav, sidebarSearch]);

  return (
    <Fragment>
      {/* Skip to main content link - WCAG 2.1 AA compliance */}
      <SkipLink targetId="main-content" label="Skip to main content" />
      
      {/* ARIA live region for screen reader announcements */}
      <div
        id="screen-reader-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div className="h-screen overflow-hidden bg-slate-50 font-sans antialiased [overscroll-behavior:none]">
      <div className="flex h-full">

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 z-[110] lg:hidden backdrop-blur-sm transition-opacity duration-300" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}

        {/* ── Sidebar ── */}
        <aside aria-label="Portal sidebar" data-tour="portal-sidebar" className={`fixed inset-y-0 left-0 z-[120] flex h-screen ${iconMode ? 'w-[68px]' : 'w-64'} transform flex-col overflow-hidden border-r border-purple-800/30 bg-gradient-to-b from-[#1a0a2e] via-[#1e1145] to-[#150d2e] shadow-2xl transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

          {/* School Header */}
          <div className={`flex items-center ${iconMode ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-3'} border-b border-white/5 bg-black/20`}>
            <div className="h-10 w-10 rounded-xl bg-white p-1.5 flex items-center justify-center border border-purple-400/20 shadow-lg shadow-purple-900/50 shrink-0">
              <img src="/icons/school-logo-source.png" alt="KNHS Logo" className="h-full w-full object-contain" loading="lazy" />
            </div>
            {!iconMode && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-extrabold tracking-tight leading-none text-white uppercase">Kiwalan NHS</span>
                <span className="text-[10px] font-bold text-purple-300/70 uppercase tracking-wider mt-0.5">Digital Campus</span>
              </div>
            )}
          </div>

          {/* Academic Year Info */}
          {!iconMode && (
            <div className="flex-shrink-0 px-3 py-2 bg-black/20 border-b border-white/5">
              <div className="flex items-center justify-between text-[10px] font-bold text-purple-300/80 uppercase tracking-wider">
                <span>{academicYear ? `SY ${academicYear}` : 'No Year Set'}</span>
                <span className="text-purple-200/60">{sysSettings?.current_term || 'Term'}</span>
              </div>
            </div>
          )}

          {/* Profile Summary */}
          <div className={`flex-shrink-0 ${iconMode ? 'px-2 py-2' : 'px-3 py-2'} border-b border-white/5`}>
            <div data-tour="sidebar-profile" onClick={() => navigate('/settings')}
              className={`flex ${iconMode ? 'justify-center' : 'items-center gap-3'} p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-400/20 transition-all cursor-pointer group`}>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-900/40 group-hover:scale-105 transition-transform uppercase overflow-hidden border-2 border-purple-400/30 shrink-0">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-xs">{user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}</span>
                )}
              </div>
              {!iconMode && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate text-white">{user?.first_name} {user?.last_name}</span>
                  <span className="text-[10px] font-bold text-purple-300/70 uppercase tracking-wider">
                    {isDualRole ? (portalMode === 'admin' ? 'Admin' : 'Teacher') : user?.role}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Portal Mode Switcher (dual-role users only) */}
          {isDualRole && !iconMode && (
            <div className="flex-shrink-0 px-3 py-2 border-b border-white/5">
              <button
                onClick={togglePortalMode}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-400/20 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  portalMode === 'admin' ? 'bg-violet-500/80 text-white' : 'bg-emerald-500/80 text-white'
                }`}>
                  {portalMode === 'admin' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5z" /></svg>
                  )}
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-[10px] font-bold text-purple-300/60 uppercase tracking-wider">Switch to</span>
                  <span className="text-xs font-bold text-white">{portalMode === 'admin' ? 'Teacher Portal' : 'Admin Portal'}</span>
                </div>
                <svg className="w-4 h-4 ml-auto text-purple-400/50 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </button>
            </div>
          )}

          {/* Sidebar Search */}
          {!iconMode && (
            <div className="flex-shrink-0 px-2.5 py-1">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-white/5 border border-white/10 rounded-lg text-[11px] text-purple-200 placeholder-purple-400/30 focus:outline-none focus:border-purple-400/30 focus:bg-white/10 transition-all"
                />
              </div>
            </div>
          )}

          {/* Nav Container */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-purple-800/50 scrollbar-track-transparent">
            {/* Quick Access (Pinned) */}
            {!iconMode && pinnedItems.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center justify-between mb-0.5 px-2.5">
                  <p className="text-[9px] font-extrabold text-amber-400/60 uppercase tracking-widest">Quick Access</p>
                </div>
                <div className="space-y-px">
                  {pinnedItems.map(path => {
                    const item = findItemByPath(path);
                    if (!item) return null;
                    return (
                      <NavItem
                        key={path}
                        to={item.to}
                        label={item.label}
                        isActive={isActive}
                        icon={item.icon}
                        onClick={() => setSidebarOpen(false)}
                        iconMode={iconMode}
                        isPinned={true}
                        onTogglePin={togglePinned}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider between pinned and main nav */}
            {!iconMode && pinnedItems.length > 0 && !sidebarSearch && (
              <div className="border-t border-white/5 my-0.5" />
            )}

            {/* Main Navigation */}
            {(() => {
              const roleKey = (isDualRole && portalMode === 'admin') ? 'admin' : user?.role;
              return (sidebarSearch ? filteredNav : currentNav).map((section, idx) => {
                const hasActiveChild = section.items.some(item => isActive(item.to));
                const isCollapsed = collapsedSections[`${roleKey}_${idx}`] ?? true;
                const forceExpanded = hasActiveChild && isCollapsed;
                const actuallyCollapsed = forceExpanded ? false : isCollapsed;
                return (
                  <div key={idx} className="mb-px last:mb-0">
                    {!iconMode && (
                      <SectionLabel
                        label={section.header}
                        collapsed={actuallyCollapsed}
                        onToggle={() => toggleSection(roleKey, idx)}
                      />
                    )}
                    <div
                      className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                      style={{ gridTemplateRows: actuallyCollapsed && !iconMode ? '0fr' : '1fr' }}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div
                          className="space-y-0.5 pb-1 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                          style={{
                            opacity: actuallyCollapsed && !iconMode ? 0 : 1,
                            transform: actuallyCollapsed && !iconMode ? 'translateY(-4px)' : 'translateY(0)',
                          }}
                        >
                          {section.items.map((item, i) => (
                            <NavItem
                              key={i}
                              to={item.to}
                              label={item.label}
                              isActive={isActive}
                              icon={item.icon}
                              href={item.href}
                              external={item.external}
                              onClick={() => setSidebarOpen(false)}
                              iconMode={iconMode}
                              isPinned={pinnedItems.includes(item.to)}
                              onTogglePin={togglePinned}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </nav>

          {/* Bottom controls */}
          <div className="flex-shrink-0 border-t border-white/5 px-2 py-2 flex justify-center">
            <button
              onClick={toggleIconMode}
              className="rounded-lg p-2 text-purple-400/50 hover:bg-white/5 hover:text-purple-200 transition-all"
              title={iconMode ? 'Expand sidebar' : 'Collapse to icons'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {iconMode
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l4 4m0 0l-4 4m4-4H3" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-4-4m0 0l4-4m-4 4h12" />
                }
              </svg>
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main 
          id="main-content" 
          tabIndex="-1"
          aria-label="Portal content" 
          data-tour="portal-main" 
          className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#F8FAFC]"
        >
          {/* Top bar */}
          <header data-tour="portal-header" className="sticky top-0 z-[80] flex items-center justify-between border-b-2 border-slate-200 bg-white px-4 py-2 shadow-sm lg:px-6">
            <div className="flex items-center gap-4 lg:gap-6">
              <button 
                onClick={() => { playSound('click'); setSidebarOpen(!sidebarOpen); }} 
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden transition-all active:scale-90"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>

              {/* Breadcrumbs */}
              <div className="hidden sm:block">
                <Breadcrumb items={breadcrumbItems} maxItems={5} className="mb-1" />
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">{pageTitle}</h1>
              </div>

              {/* Mobile Title */}
              <h1 className="text-base font-extrabold text-slate-900 sm:hidden tracking-tight">{pageTitle}</h1>


            </div>



            <div className="flex items-center space-x-2 lg:space-x-3">
              {/* Search Bar */}
              <div className="hidden lg:block">
                <SearchBar 
                  placeholder="Search features..."
                  suggestions={searchSuggestions}
                  className="w-80"
                />
              </div>

              {/* PWA Download App (header) */}
              <HeaderDownloadButton />

              {/* Notification bell */}
              <div className="relative" data-notif-dropdown ref={notifDropdownRef}>
                <button 
                  ref={notifBtnRef}
                  onClick={() => {
                    playSound('click');
                    if (!showNotifications && notifBtnRef.current) {
                      const rect = notifBtnRef.current.getBoundingClientRect();
                      setNotifDropdownPos({ top: rect.bottom + 12, right: window.innerWidth - rect.right });
                    }
                    setShowNotifications(!showNotifications);
                  }} 
                  data-tour="notifications"
                  className={`relative rounded-xl p-2.5 transition-all duration-200 ${showNotifications ? 'bg-violet-100 text-violet-700 shadow-inner scale-95' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div
                    className="fixed w-72 max-w-[calc(100vw-1.5rem)] sm:w-96 sm:max-w-[calc(100vw-2rem)] rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ top: notifDropdownPos.top, right: notifDropdownPos.right }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-4 bg-gradient-to-r from-[#1A0B2E] to-[#2D1452] text-white">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xs sm:text-sm tracking-tight">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="bg-rose-500 text-white text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full uppercase">{unreadCount} New</span>
                        )}
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-400' : isPolling ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'}`}></div>
                        <span className="text-[10px] text-violet-200 font-black uppercase tracking-widest">
                          {realtimeConnected ? 'Live' : isPolling ? 'Polling' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[40vh] sm:max-h-[400px] overflow-y-auto divide-y divide-slate-50 scrollbar-thin">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 sm:py-12 text-slate-300">
                          <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-violet-50 flex items-center justify-center mb-2 sm:mb-4">
                            <svg className="w-5 h-5 sm:w-8 sm:h-8 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-400">All caught up!</p>
                          <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5">No new notifications</p>
                        </div>
                      ) : (
                        notifications.map((n, idx) => {
                          const cfg = getNotifConfig(n.notification_type);
                          const isFresh = idx < 3 && !n.is_read;
                          return (
                            <div 
                              key={n.id}
                              onClick={() => { 
                                if (!n.is_read) markAsRead(n.id); 
                                if (n.link) { navigate(n.link); setShowNotifications(false); } 
                              }}
                              className={`flex items-start gap-2.5 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-4 cursor-pointer transition-all hover:bg-slate-50 group
                                ${!n.is_read ? 'bg-violet-50/40' : ''}
                                ${isFresh ? 'animate-[slideIn_0.3s_ease-out]' : ''}`}
                            >
                              <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm group-hover:scale-110 transition-transform`}>
                                <svg className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${cfg.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cfg.icon} />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs sm:text-sm leading-tight mb-0.5 ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                                  {n.title}
                                </p>
                                <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-1 sm:line-clamp-2 mb-1 sm:mb-2">{n.message}</p>
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatTime(n.created_at)}</p>
                              </div>
                              {!n.is_read && (
                                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-violet-600 flex-shrink-0 mt-1.5 shadow-sm shadow-violet-200" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 px-3 sm:px-5 py-2 sm:py-3 bg-slate-50 flex items-center justify-between">
                      <button 
                        onClick={markAllAsRead}
                        className="text-[9px] sm:text-[10px] font-black text-violet-600 hover:text-violet-800 uppercase tracking-widest transition-colors"
                      >
                        Mark all as read
                      </button>
                      <Link 
                        to="/notifications" 
                        onClick={() => setShowNotifications(false)}
                        className="text-[9px] sm:text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                      >
                        View all
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>

              {/* Mute toggle */}
              <MuteButton />

              {/* User Profile Summary (Desktop) */}
              <div className="hidden md:flex items-center gap-3 pl-1" ref={userMenuRef}>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-900 leading-none">{user?.first_name}</span>
                  <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mt-1">{user?.role}</span>
                </div>
                <div className="relative">
                  <button
                    ref={userBtnRef}
                    data-tour="user-profile"
                    onClick={() => {
                      playSound('click');
                      if (!showUserMenu && userBtnRef.current) {
                        const rect = userBtnRef.current.getBoundingClientRect();
                        setUserMenuPos({ top: rect.bottom + 12, right: window.innerWidth - rect.right });
                      }
                      setShowUserMenu(!showUserMenu);
                    }}
                    className={`h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-lg transition-all overflow-hidden border-2 ${showUserMenu ? 'border-violet-400 scale-95' : 'border-slate-200 hover:rotate-3 hover:scale-105'}`}
                  >
                    {user?.profile_picture ? (
                      <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-sm font-black uppercase tracking-tighter">
                        {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                      </span>
                    )}
                  </button>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div
                      className="fixed w-56 rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                      style={{ top: userMenuPos.top, right: userMenuPos.right }}
                    >
                      {/* User Info */}
                      <div className="px-4 py-3 bg-gradient-to-r from-[#1A0B2E] to-[#2D1452]">
                        <p className="text-sm font-bold text-white truncate">{user?.first_name} {user?.last_name}</p>
                        <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mt-0.5">{user?.email}</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </button>
                        <button
                          onClick={() => { setShowUserMenu(false); window.location.href = '/'; }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Visit Website
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-slate-100 py-1">
                        <button
                          onClick={() => { setShowUserMenu(false); handleLogout(); }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Viewport */}

          <div className="flex-1 min-h-0 mx-auto w-full max-w-[1600px] p-3 lg:p-4 scroll-smooth pb-20 lg:pb-4">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      {/* Only shown on small screens as a quick-access nav */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 inset-x-0 z-[90] lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl shadow-slate-900/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around px-2 py-1">
          {/* Dashboard */}
          <Link
            to={homePath}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all active:scale-90 min-w-[56px] ${
              isHomeActive ? 'text-violet-600' : 'text-slate-400'
            }`}
          >
            <svg className="w-5 h-5" fill={isHomeActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isHomeActive ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className={`text-[9px] font-bold uppercase tracking-wide ${isHomeActive ? 'text-violet-600' : 'text-slate-400'}`}>Home</span>
          </Link>

          {/* Bulletins */}
          <Link
            to="/communication-center?tab=bulletins"
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all active:scale-90 min-w-[56px] ${
              isCommunicationTabActive('bulletins') ? 'text-violet-600' : 'text-slate-400'
            }`}
          >
            <svg className="w-5 h-5" fill={isCommunicationTabActive('bulletins') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isCommunicationTabActive('bulletins') ? 0 : 2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span className={`text-[9px] font-bold uppercase tracking-wide ${isCommunicationTabActive('bulletins') ? 'text-violet-600' : 'text-slate-400'}`}>News</span>
          </Link>

          {/* Messages (students/teachers) or Calendar (parents) */}
          {user?.role === 'parent' ? (
            <Link
              to="/portal-calendar"
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all active:scale-90 min-w-[56px] ${
                isActive('/portal-calendar') ? 'text-violet-600' : 'text-slate-400'
              }`}
            >
              <svg className="w-5 h-5" fill={isActive('/portal-calendar') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/portal-calendar') ? 0 : 2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className={`text-[9px] font-bold uppercase tracking-wide ${isActive('/portal-calendar') ? 'text-violet-600' : 'text-slate-400'}`}>Cal</span>
            </Link>
          ) : (
            <Link
              to="/communication-center?tab=inbox"
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all active:scale-90 min-w-[56px] ${
                isCommunicationTabActive('inbox') ? 'text-violet-600' : 'text-slate-400'
              }`}
            >
              <svg className="w-5 h-5" fill={isCommunicationTabActive('inbox') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isCommunicationTabActive('inbox') ? 0 : 2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className={`text-[9px] font-bold uppercase tracking-wide ${isCommunicationTabActive('inbox') ? 'text-violet-600' : 'text-slate-400'}`}>Chat</span>
            </Link>
          )}

          {/* Notifications */}
          <Link
            to="/notifications"
            className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all active:scale-90 min-w-[56px] ${
              isActive('/notifications') ? 'text-violet-600' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <svg className="w-5 h-5" fill={isActive('/notifications') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/notifications') ? 0 : 2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white border border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-wide ${isActive('/notifications') ? 'text-violet-600' : 'text-slate-400'}`}>Alerts</span>
          </Link>

          {/* Menu (opens sidebar) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all active:scale-90 text-slate-400 min-w-[56px]"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-wide">Menu</span>
          </button>

          {/* Profile (mobile) */}
          <div className="relative" ref={mobileUserMenuRef}>
            <button
              onClick={() => { playSound('click'); setShowMobileUserMenu(!showMobileUserMenu); }}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all active:scale-90 min-w-[56px]"
              aria-label="User menu"
            >
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white overflow-hidden">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-[8px] font-black uppercase">{user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}</span>
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">You</span>
            </button>

            {/* Mobile User Menu Dropdown */}
            {showMobileUserMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-52 rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-[100]">
                <div className="px-4 py-3 bg-gradient-to-r from-[#1A0B2E] to-[#2D1452]">
                  <p className="text-sm font-bold text-white truncate">{user?.first_name} {user?.last_name}</p>
                  <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mt-0.5">{user?.role}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setShowMobileUserMenu(false); navigate('/settings'); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </button>
                  <button
                    onClick={() => { setShowMobileUserMenu(false); window.location.href = '/'; }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Visit Website
                  </button>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={() => { setShowMobileUserMenu(false); handleLogout(); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
      </div>
    </Fragment>
  );
};

export default Layout;
