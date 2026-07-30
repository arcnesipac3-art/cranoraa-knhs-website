import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Button, LoadingSpinner } from '../components/ui';
import { ICONS, Icon, Toggle, Field, Input, SectionCard, Spinner, Skeleton, EmailServiceNotice } from './settings/shared';

// ── Image Crop Modal ────────────────────────────────────────────────────────
const ImageCropModal = ({ isOpen, onClose, onCrop, imageSrc }) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const CROP_SIZE = 400;

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  const handleImgLoad = (e) => {
    setImgNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: t.clientX - position.x, y: t.clientY - position.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    setPosition({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const displaySize = Math.min(containerRect.width, containerRect.height);

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext('2d');

    const imgDisplayW = img.clientWidth;
    const imgDisplayH = img.clientHeight;

    const srcX = ((displaySize / 2 - position.x - (imgDisplayW - displaySize) / 2 * zoom) / (imgDisplayW * zoom)) * imgNatural.w;
    const srcY = ((displaySize / 2 - position.y - (imgDisplayH - displaySize) / 2 * zoom) / (imgDisplayH * zoom)) * imgNatural.h;
    const srcSize = (displaySize / (imgDisplayW * zoom)) * imgNatural.w;

    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, CROP_SIZE, CROP_SIZE);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'profile.jpg', { type: 'image/jpeg', lastModified: Date.now() });
        onCrop(file);
        onClose();
      }
    }, 'image/jpeg', 0.92);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-black text-slate-900">Edit Profile Picture</h3>
          <p className="text-xs text-slate-500 mt-0.5">Drag to reposition, use slider to zoom</p>
        </div>

        <div className="p-6">
          <div ref={containerRef} className="relative mx-auto w-48 h-48 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}>
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop"
              onLoad={handleImgLoad}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              draggable={false}
            />
            <div className="absolute inset-0 rounded-full border-2 border-white/40 pointer-events-none" />
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-600"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-white transition-colors">
            Cancel
          </button>
          <button onClick={handleCrop} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm">
            Crop & Upload
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>,
    document.body
  );
};

// ── Roles & Permissions Tab ──────────────────────────────────────────────

const RolesPermissionsTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/users/')
      .then(r => {
        const data = r.data.results || r.data;
        setUsers(data);
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const roleConfig = {
    admin: { label: 'Administrator', color: 'bg-rose-100 text-rose-700', desc: 'Full system access' },
    staff: { label: 'Staff', color: 'bg-blue-100 text-blue-700', desc: 'Teacher / Registrar / Guidance' },
    student: { label: 'Student', color: 'bg-emerald-100 text-emerald-700', desc: 'Student portal access' },
    parent: { label: 'Parent', color: 'bg-amber-100 text-amber-700', desc: 'Parent portal access' },
  };

  const filtered = users.filter(u => {
    const q = filter.toLowerCase();
    return !q || u.role === q || u.username?.toLowerCase().includes(q) || u.first_name?.toLowerCase().includes(q);
  });

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <SectionCard title="Role Overview" subtitle="User distribution by role" icon="shield">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(roleConfig).map(([key, config]) => (
            <div key={key} className={`${config.color} rounded-lg p-3 text-center`}>
              <p className="text-2xl font-extrabold">{roleCounts[key] || 0}</p>
              <p className="text-xs font-bold mt-1">{config.label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Role Permissions" subtitle="What each role can access" icon="shield">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-extrabold text-slate-700">Feature</th>
                <th className="text-center py-2 px-3 font-extrabold text-rose-700">Admin</th>
                <th className="text-center py-2 px-3 font-extrabold text-blue-700">Staff</th>
                <th className="text-center py-2 px-3 font-extrabold text-emerald-700">Student</th>
                <th className="text-center py-2 px-3 font-extrabold text-amber-700">Parent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { feature: 'View Dashboard', admin: true, staff: true, student: true, parent: true },
                { feature: 'Enter Grades', admin: true, staff: true, student: false, parent: false },
                { feature: 'Manage Users', admin: true, staff: false, student: false, parent: false },
                { feature: 'System Settings', admin: true, staff: false, student: false, parent: false },
                { feature: 'Chat / Messaging', admin: true, staff: true, student: true, parent: false },
                { feature: 'View Reports', admin: true, staff: true, student: true, parent: true },
                { feature: 'Manage Enrollment', admin: true, staff: true, student: false, parent: false },
                { feature: 'Database Backup', admin: true, staff: false, student: false, parent: false },
                { feature: 'Audit Logs', admin: true, staff: false, student: false, parent: false },
              ].map(row => (
                <tr key={row.feature} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-bold text-slate-700">{row.feature}</td>
                  {['admin', 'staff', 'student', 'parent'].map(role => (
                    <td key={role} className="py-2 px-3 text-center">
                      {row[role] ? (
                        <svg className="w-4 h-4 text-emerald-500 mx-auto" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-slate-300 mx-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="User List" subtitle="All registered users and their roles" icon="users">
        <div className="mb-4">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all">
            <option value="">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="staff">Staff</option>
            <option value="student">Students</option>
            <option value="parent">Parents</option>
          </select>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {filtered.slice(0, 50).map(u => (
            <div key={u.id} className="flex items-center justify-between py-2.5 px-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                  {u.first_name?.[0]}{u.last_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{u.first_name} {u.last_name}</p>
                  <p className="text-[11px] text-slate-500">@{u.username}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${roleConfig[u.role]?.color || 'bg-slate-100 text-slate-600'}`}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

// ── Communication Settings Tab ───────────────────────────────────────────

const CommunicationSettingsTab = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/system/settings/')
      .then(r => setSettings(r.data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/system/settings/', {
        allow_student_chat: settings.allow_student_chat,
        allow_teacher_chat: settings.allow_teacher_chat,
      });
      toast.success('Communication settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading || !settings) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  return (
    <form onSubmit={save} className="space-y-6">
      <SectionCard title="Messaging Permissions" subtitle="Control who can use the chat system" icon="message">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Student Messaging</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Allow students to send messages to teachers and classmates</p>
            </div>
            <Toggle checked={settings.allow_student_chat} onChange={e => setSettings(p => ({...p, allow_student_chat: e.target.checked}))} />
          </div>
          <div className="h-px bg-slate-100" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Teacher Messaging</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Allow teachers to send messages to students and other staff</p>
            </div>
            <Toggle checked={settings.allow_teacher_chat} onChange={e => setSettings(p => ({...p, allow_teacher_chat: e.target.checked}))} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Email Service" subtitle="Email delivery configuration" icon="mail">
        <div className="space-y-3">
          {settings.email_service_health ? (
            <>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${settings.email_service_health.status === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                <span className={`w-2 h-2 rounded-full ${settings.email_service_health.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-xs font-bold">{settings.email_service_health.summary}</span>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p>Sender: <span className="font-bold">{settings.email_service_health.sender_email || 'Not configured'}</span></p>
                <p>API Keys: <span className="font-bold">{settings.email_service_health.checks?.api_credentials ? 'Present' : 'Missing'}</span></p>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">Email service status not available.</p>
          )}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} loading={saving} variant="primary">
          Save Communication Settings
        </Button>
      </div>
    </form>
  );
};

// ── Backup Management Tab ────────────────────────────────────────────────

const BackupManagementTab = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchBackups = async () => {
    try {
      const r = await api.get('/admin/backups/');
      setBackups(r.data.results || r.data);
    } catch { toast.error('Failed to load backups'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBackups(); }, []);

  const createBackup = async () => {
    setCreating(true);
    try {
      await api.post('/admin/run-backup/');
      toast.success('Backup created successfully');
      fetchBackups();
    } catch { toast.error('Failed to create backup'); }
    finally { setCreating(false); }
  };

  const downloadBackup = async (filename) => {
    try {
      const r = await api.get(`/admin/backups/${filename}/download/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      // Revoke the blob URL to prevent memory leak
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch { toast.error('Failed to download backup'); }
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <SectionCard title="Database Backups" subtitle="Create and manage database backups" icon="database">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{backups.length} backup(s) on record</p>
            <Button onClick={createBackup} disabled={creating} loading={creating} variant="primary" size="sm">
              Create Backup
            </Button>
          </div>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm font-bold">No backups yet</p>
              <p className="text-xs mt-1">Create your first backup to secure your data.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {backups.map(b => (
                <div key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{b.filename}</p>
                    <p className="text-[11px] text-slate-500">{b.size} &middot; {new Date(b.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => downloadBackup(b.filename)}
                    className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

// ── Audit Logs Tab ───────────────────────────────────────────────────────

const AuditLogsTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/admin/audit-logs/')
      .then(r => setLogs(r.data.results || r.data))
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, []);

  const typeColors = {
    create: 'bg-emerald-100 text-emerald-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-rose-100 text-rose-700',
    login: 'bg-violet-100 text-violet-700',
    logout: 'bg-slate-100 text-slate-600',
    approve: 'bg-emerald-100 text-emerald-700',
    reject: 'bg-amber-100 text-amber-700',
    export: 'bg-cyan-100 text-cyan-700',
    import: 'bg-cyan-100 text-cyan-700',
    grade_create: 'bg-violet-100 text-violet-700',
    grade_update: 'bg-violet-100 text-violet-700',
    grade_delete: 'bg-rose-100 text-rose-700',
    attendance_mark: 'bg-blue-100 text-blue-700',
    mute: 'bg-amber-100 text-amber-700',
    suspend: 'bg-rose-100 text-rose-700',
  };

  const filtered = logs.filter(l => {
    const q = filter.toLowerCase();
    return !q || l.action_type === q || l.description?.toLowerCase().includes(q);
  });

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <SectionCard title="System Audit Logs" subtitle="Track all system activity and changes" icon="clock">
        <div className="space-y-4">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all">
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="grade_create">Grade Create</option>
            <option value="grade_update">Grade Update</option>
            <option value="attendance_mark">Attendance Mark</option>
          </select>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">No audit logs found.</p>
            ) : (
              filtered.slice(0, 100).map(log => (
                <div key={log.id} className="py-2.5 px-1 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{log.description}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {log.user?.username || 'System'} &middot; {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeColors[log.action_type] || 'bg-slate-100 text-slate-600'}`}>
                      {log.action_type || log.action}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

// ── School Info Tab ─────────────────────────────────────────────────────────

const SchoolInfoTab = () => {
  const [form, setForm] = useState({
    site_name: '', school_address: '', school_phone: '', school_email: '',
    primary_color: '#2D1B4D', secondary_color: '#9F7AEA',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const logoRef = useRef();
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    api.get('/system/settings/').then(r => {
      setForm({
        site_name: r.data.site_name || '',
        school_address: r.data.school_address || '',
        school_phone: r.data.school_phone || '',
        school_email: r.data.school_email || '',
        primary_color: r.data.primary_color || '#2D1B4D',
        secondary_color: r.data.secondary_color || '#9F7AEA',
      });
      if (r.data.school_logo) setLogoPreview(r.data.school_logo);
    }).catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/system/settings/', form);
      toast.success('School info saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be under 2MB');
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('school_logo', file);
      await api.patch('/system/settings/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setLogoPreview(URL.createObjectURL(file));
      toast.success('Logo updated');
    } catch { toast.error('Failed to upload logo'); }
    finally { setUploadingLogo(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  return (
    <form onSubmit={save} className="space-y-6">
      <SectionCard title="School Identity" subtitle="Displayed across the portal and public website" icon="building">
        <div className="flex items-start gap-6 mb-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {logoPreview
                 ? <img src={logoPreview} alt="School logo" className="w-full h-full object-contain" loading="lazy" />
                : <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              }
            </div>
            <button type="button" onClick={() => logoRef.current?.click()}
              disabled={uploadingLogo}
              className="mt-2 w-20 text-center text-[10px] font-black text-violet-600 hover:text-violet-800 uppercase tracking-widest disabled:opacity-50">
              {uploadingLogo ? 'Uploading…' : 'Change'}
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} aria-label="Upload school logo" />
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="School / Site Name">
              <Input value={form.site_name} onChange={e => setForm(p => ({...p, site_name: e.target.value}))} placeholder="KNHS School Portal" />
            </Field>
            <Field label="School Email">
              <Input type="email" value={form.school_email} onChange={e => setForm(p => ({...p, school_email: e.target.value}))} placeholder="info@school.edu.ph" />
            </Field>
            <Field label="Phone Number">
              <Input value={form.school_phone} onChange={e => setForm(p => ({...p, school_phone: e.target.value}))} placeholder="(02) 123-4567" />
            </Field>
          </div>
        </div>
        <Field label="School Address">
          <textarea value={form.school_address} onChange={e => setForm(p => ({...p, school_address: e.target.value}))}
            rows={2} placeholder="Complete school address"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 focus:bg-white transition-all resize-none" />
        </Field>
      </SectionCard>

      <SectionCard title="Brand Colors" subtitle="Used in portal UI accents" icon="palette">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Primary Color">
            <div className="flex items-center gap-3">
              <input type="color" value={form.primary_color} onChange={e => setForm(p => ({...p, primary_color: e.target.value}))}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white" aria-label="Primary color" />
              <Input value={form.primary_color} onChange={e => setForm(p => ({...p, primary_color: e.target.value}))} className="font-mono" />
            </div>
          </Field>
          <Field label="Secondary Color">
            <div className="flex items-center gap-3">
              <input type="color" value={form.secondary_color} onChange={e => setForm(p => ({...p, secondary_color: e.target.value}))}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white" aria-label="Secondary color" />
              <Input value={form.secondary_color} onChange={e => setForm(p => ({...p, secondary_color: e.target.value}))} className="font-mono" />
            </div>
          </Field>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} loading={saving} variant="primary">
          Save School Info
        </Button>
      </div>
    </form>
  );
};

// ── Academic Years Tab (imported from ./settings/) ────────────────────────────
import AcademicYearsTab from './settings/AcademicYearsTab';

// ── Portal Settings Tab ─────────────────────────────────────────────────────

const PortalSettingsTab = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  useEffect(() => {
    api.get('/system/settings/')
      .then(r => setSettings(r.data))
      .catch(() => toast.error('Failed to load portal settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { academic_year, ...patchData } = settings;
      const r = await api.patch('/system/settings/', patchData);
      setSettings(r.data);
      toast.success('Portal settings saved');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const toggleMaintenance = async (val) => {
    setTogglingMaintenance(true);
    try {
      const r = await api.patch('/system/settings/', { maintenance_mode: val, maintenance_message: settings.maintenance_message });
      setSettings(r.data);
      toast.success(`Maintenance mode ${val ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to toggle maintenance mode'); }
    finally { setTogglingMaintenance(false); }
  };

  if (loading || !settings) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  return (
    <form onSubmit={save} className="space-y-6">
      <EmailServiceNotice health={settings.email_service_health} />

      <SectionCard title="Academic Context" subtitle="Controls global defaults for grading and analytics" icon="school">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Academic Level" hint="Determines grading period structure">
              <select value={settings.academic_level} onChange={e => setSettings(p => ({...p, academic_level: e.target.value, current_quarter: '1'}))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all">
                <option value="jhs">Junior High School (Grades 7-10)</option>
                <option value="shs">Senior High School (Grades 11-12)</option>
                <option value="both">Both (JHS + SHS)</option>
              </select>
            </Field>
            <Field label={settings.academic_level === 'shs' ? 'Current Semester' : 'Current Term'} hint="Used as default when entering grades">
              <select value={settings.current_quarter} onChange={e => setSettings(p => ({...p, current_quarter: e.target.value}))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all">
                {settings.academic_level === 'shs' ? (
                  <>
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                    <option value="3">3rd Semester (Summer)</option>
                  </>
                ) : (
                  <>
                    <option value="1">1st Term</option>
                    <option value="2">2nd Term</option>
                    <option value="3">3rd Term</option>
                  </>
                )}
              </select>
            </Field>
            <Field label="Active Academic Year" hint="Automatically synced when you activate a year in Academic Years tab">
              <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-800">
                {settings.academic_year || <span className="text-slate-400 italic font-normal">No year activated yet</span>}
              </div>
            </Field>
          </div>

          {/* Grading Period Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Grading Period Structure</p>
            <div className="flex flex-wrap gap-2">
              {(settings.academic_level === 'shs'
                ? ['1st Semester', '2nd Semester', '3rd Semester (Summer)']
                : ['1st Term', '2nd Term', '3rd Term']
              ).map((label, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  String(i + 1) === settings.current_quarter 
                    ? 'bg-violet-100 border-violet-300 text-violet-800' 
                    : 'bg-white border-slate-200 text-slate-600'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    String(i + 1) === settings.current_quarter 
                      ? 'bg-violet-600 text-white' 
                      : 'bg-slate-200 text-slate-600'
                  }`}>{i + 1}</span>
                  <span className="text-xs font-bold">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-3">
              {settings.academic_level === 'both'
                ? 'Both JHS and SHS use a term-based grading system with 3 grading periods per academic year.'
                : settings.academic_level === 'shs'
                  ? 'Senior High School uses a semester-based grading system with 3 grading periods per academic year.'
                  : 'Junior High School uses a term-based grading system with 3 grading periods per academic year.'}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Enrollment" subtitle="Control online enrollment availability" icon="clipboard">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">Online Enrollment Open</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Allow applicants to submit enrollment forms via the public website</p>
          </div>
          <Toggle checked={settings.enrollment_open} onChange={e => setSettings(p => ({...p, enrollment_open: e.target.checked}))} color="emerald" />
        </div>
      </SectionCard>

      <SectionCard title="Maintenance Mode" subtitle="Temporarily disable portal access for non-admins" icon="wrench" danger>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-rose-900">Enable Maintenance Mode</p>
              <p className="text-xs text-rose-600 font-medium mt-0.5">All users except admins will see the maintenance page</p>
            </div>
            <Toggle checked={settings.maintenance_mode} onChange={e => toggleMaintenance(e.target.checked)} disabled={togglingMaintenance} color="rose" />
          </div>
          {settings.maintenance_mode && (
            <Field label="Maintenance Message">
              <textarea value={settings.maintenance_message} onChange={e => setSettings(p => ({...p, maintenance_message: e.target.value}))}
                rows={3} placeholder="The portal is currently undergoing maintenance…"
                className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-lg text-sm font-medium text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all resize-none" />
            </Field>
          )}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} loading={saving} variant="primary">
          Save Portal Settings
        </Button>
      </div>
    </form>
  );
};

// ── My Profile Tab ──────────────────────────────────────────────────────────

const ProfileTab = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const picRef = useRef();
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [form, setForm] = useState({
    title: '', first_name: '', middle_name: '', last_name: '', email: '',
    sex: '', date_of_birth: '', nationality: '', state: '',
    father_name: '', mother_name: '', contact_information: '',
    phone_number: '', address: '', registration_number: '', grade_level: '',
  });

  useEffect(() => {
    api.get('/student/profile/').then(r => {
      setProfile(r.data);
      setForm({
        title:               r.data.profile?.title || '',
        first_name:          r.data.first_name || '',
        middle_name:         r.data.profile?.middle_name || '',
        last_name:           r.data.last_name || '',
        email:               r.data.email || '',
        sex:                 r.data.profile?.sex || '',
        date_of_birth:       r.data.profile?.date_of_birth || '',
        nationality:         r.data.profile?.nationality || '',
        state:               r.data.profile?.state || '',
        father_name:         r.data.profile?.father_name || '',
        mother_name:         r.data.profile?.mother_name || '',
        contact_information: r.data.profile?.contact_information || '',
        phone_number:        r.data.profile?.phone_number || '',
        address:             r.data.profile?.address || '',
        registration_number: r.data.profile?.registration_number || '',
        grade_level:         r.data.profile?.grade_level || '',
      });
    }).catch(() => toast.error('Failed to load profile')).finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim())
      return toast.error('First name and last name are required');
    setSaving(true);
    try {
      await api.put('/student/profile/', form);
      await refreshUser();
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const handlePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) return toast.error('Only JPEG, PNG, GIF, and WebP images are allowed');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be less than 5MB');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropImageSrc(ev.target.result);
      setPendingFile(file);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropUpload = async (croppedFile) => {
    setUploadingPic(true);
    try {
      const fd = new FormData();
      fd.append('profile_picture', croppedFile);
      const r = await api.post('/student/profile/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(p => ({ ...p, profile: { ...p?.profile, profile_picture: r.data.profile_picture } }));
      await refreshUser();
      toast.success('Profile picture updated');
    } catch { toast.error('Failed to upload picture'); }
    finally { setUploadingPic(false); }
  };

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  const fullName = [profile?.first_name, profile?.profile?.middle_name, profile?.last_name].filter(Boolean).join(' ') || 'No name set';
  const initials = [profile?.first_name, profile?.last_name].filter(Boolean).map(n => n[0].toUpperCase()).join('') || '?';
  const profilePic = profile?.profile?.profile_picture;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <SectionCard title="My Profile" subtitle="View and update your personal information" icon="user">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black overflow-hidden shadow-lg">
              {profilePic
                ? <img src={profilePic} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
                : <span>{initials}</span>
              }
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 flex gap-1">
              {profilePic && (
                <button type="button" onClick={() => { setCropImageSrc(profilePic); setCropOpen(true); }} disabled={uploadingPic}
                  className="w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-emerald-600 transition-all disabled:opacity-50 border-2 border-white"
                  title="Crop existing picture">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
              <button type="button" onClick={() => picRef.current?.click()} disabled={uploadingPic}
                className="w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-violet-700 transition-all disabled:opacity-50 border-2 border-white"
                title="Upload new picture">
                {uploadingPic
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                }
              </button>
            </div>
            <input ref={picRef} type="file" className="hidden" accept="image/*" onChange={handlePicUpload} />
          </div>
          <div>
            <p className="text-base font-black text-slate-900">{fullName}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{user?.role} · {profile?.email}</p>
          </div>
        </div>
      </SectionCard>

      {editing ? (
        <form onSubmit={save} className="space-y-6">
          {/* Name */}
          <SectionCard title="Name Details" subtitle="Your full legal name" icon="user">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user?.role === 'staff' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Title</label>
                  <select value={form.title} onChange={e => set('title')(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 focus:bg-white transition-all">
                    <option value="">Select</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Prof.">Prof.</option>
                  </select>
                </div>
              )}
              <Field label="First Name" hint="Required">
                <Input value={form.first_name} onChange={e => set('first_name')(e.target.value)} required />
              </Field>
              <Field label="Middle Name">
                <Input value={form.middle_name} onChange={e => set('middle_name')(e.target.value)} />
              </Field>
              <Field label="Last Name" hint="Required">
                <Input value={form.last_name} onChange={e => set('last_name')(e.target.value)} required />
              </Field>
            </div>
          </SectionCard>

          {/* Personal */}
          <SectionCard title="Personal Information" subtitle="Demographics and personal details" icon="info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Sex</label>
                <select value={form.sex} onChange={e => set('sex')(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 focus:bg-white transition-all">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Field label="Date of Birth">
                <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth')(e.target.value)} />
              </Field>
              <Field label="Nationality">
                <Input value={form.nationality} onChange={e => set('nationality')(e.target.value)} />
              </Field>
              <Field label="Province / State">
                <Input value={form.state} onChange={e => set('state')(e.target.value)} />
              </Field>
            </div>
          </SectionCard>

          {/* Family */}
          <SectionCard title="Family Details" subtitle="Parent or guardian information" icon="users">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Father's Name">
                <Input value={form.father_name} onChange={e => set('father_name')(e.target.value)} />
              </Field>
              <Field label="Mother's Name">
                <Input value={form.mother_name} onChange={e => set('mother_name')(e.target.value)} />
              </Field>
            </div>
          </SectionCard>

          {/* Academic */}
          <SectionCard title="Academic Record" subtitle="School enrollment information" icon="book">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="LRN (Learner Reference Number)">
                <Input value={form.registration_number} onChange={e => set('registration_number')(e.target.value)} />
              </Field>
              <Field label="Grade Level">
                <Input value={form.grade_level} onChange={e => set('grade_level')(e.target.value)} />
              </Field>
            </div>
          </SectionCard>

          {/* Contact */}
          <SectionCard title="Contact Information" subtitle="How to reach you" icon="mail">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Email Address" hint="Used for notifications and password reset">
                <Input type="email" value={form.email} onChange={e => set('email')(e.target.value)} placeholder="your@email.com" />
              </Field>
              <Field label="Phone Number">
                <Input value={form.phone_number} onChange={e => set('phone_number')(e.target.value)} placeholder="+63 912 345 6789" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Address">
                  <textarea value={form.address} onChange={e => set('address')(e.target.value)}
                    rows={2} placeholder="Your home address"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 focus:bg-white transition-all resize-none" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Emergency Contact" hint="Name, relationship, phone number">
                  <textarea value={form.contact_information} onChange={e => set('contact_information')(e.target.value)}
                    rows={2} placeholder="Name, relationship, phone number…"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 focus:bg-white transition-all resize-none" />
                </Field>
              </div>
            </div>
          </SectionCard>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} loading={saving} variant="primary" className="flex-1">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          {/* View mode */}
          <SectionCard title="Name Details" subtitle="Your full legal name" icon="user">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user?.role === 'staff' && <Field label="Title">{profile?.profile?.title || '—'}</Field>}
              <Field label="First Name">{profile?.first_name || '—'}</Field>
              <Field label="Middle Name">{profile?.profile?.middle_name || '—'}</Field>
              <Field label="Last Name">{profile?.last_name || '—'}</Field>
            </div>
          </SectionCard>

          <SectionCard title="Personal Information" subtitle="Demographics and personal details" icon="info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Sex">{profile?.profile?.sex ? profile.profile.sex.charAt(0).toUpperCase() + profile.profile.sex.slice(1) : '—'}</Field>
              <Field label="Date of Birth">{profile?.profile?.date_of_birth
                ? new Date(profile.profile.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : '—'}</Field>
              <Field label="Nationality">{profile?.profile?.nationality || '—'}</Field>
              <Field label="Province / State">{profile?.profile?.state || '—'}</Field>
            </div>
          </SectionCard>

          <SectionCard title="Family Details" subtitle="Parent or guardian information" icon="users">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Father's Name">{profile?.profile?.father_name || '—'}</Field>
              <Field label="Mother's Name">{profile?.profile?.mother_name || '—'}</Field>
            </div>
          </SectionCard>

          <SectionCard title="Contact Information" subtitle="How to reach you" icon="mail">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Email Address">{profile?.email || '—'}</Field>
              <Field label="Phone Number">{profile?.profile?.phone_number || '—'}</Field>
              <div className="md:col-span-2">
                <Field label="Address">{profile?.profile?.address || '—'}</Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Emergency Contact">{profile?.profile?.contact_information || '—'}</Field>
              </div>
            </div>
          </SectionCard>

          {(profile?.profile?.registration_number || profile?.profile?.grade_level) && (
            <SectionCard title="Academic Record" subtitle="School enrollment information" icon="book">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="LRN">{profile?.profile?.registration_number || '—'}</Field>
                <Field label="Grade Level">{profile?.profile?.grade_level || '—'}</Field>
              </div>
            </SectionCard>
          )}

          <div className="flex justify-end pt-2">
            <Button type="button" variant="primary" onClick={() => setEditing(true)}>
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </Button>
          </div>
        </>
      )}

      <ImageCropModal
        isOpen={cropOpen}
        onClose={() => { setCropOpen(false); setCropImageSrc(null); setPendingFile(null); }}
        onCrop={handleCropUpload}
        imageSrc={cropImageSrc}
      />
    </div>
  );
};

// ── Security Tab ────────────────────────────────────────────────────────────

const SecurityTab = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [strength, setStrength] = useState(0);

  const calcStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const handleNewPw = (val) => {
    setForm(p => ({...p, newPassword: val}));
    setStrength(calcStrength(val));
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-violet-500', 'bg-emerald-500'];

  const save = async (e) => {
    e.preventDefault();
    if (!form.currentPassword) return toast.error('Please enter your current password');
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.post('/auth/change-password/', { current_password: form.currentPassword, new_password: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setStrength(0);
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <SectionCard title="Change Password" subtitle="Keep your account secure with a strong password" icon="lock">
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg mb-5 flex gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-xs font-bold text-amber-800">Use at least 8 characters with a mix of uppercase, numbers, and symbols for a strong password.</p>
        </div>
        <div className="space-y-4">
          <Field label="Current Password">
            <Input type="password" value={form.currentPassword} onChange={e => setForm(p => ({...p, currentPassword: e.target.value}))} placeholder="••••••••" required />
          </Field>
          <Field label="New Password">
            <Input type="password" value={form.newPassword} onChange={e => handleNewPw(e.target.value)} placeholder="••••••••" required />
            {form.newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : 'bg-slate-200'}`} />
                  ))}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${strengthColor[strength].replace('bg-', 'text-')}`}>
                  {strengthLabel[strength]}
                </p>
              </div>
            )}
          </Field>
          <Field label="Confirm New Password">
            <Input type="password" value={form.confirmPassword} onChange={e => setForm(p => ({...p, confirmPassword: e.target.value}))} placeholder="••••••••" required />
            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">Passwords do not match</p>
            )}
          </Field>
        </div>
      </SectionCard>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || (form.confirmPassword && form.newPassword !== form.confirmPassword)} loading={saving} variant="primary">
          Update Password
        </Button>
      </div>
    </form>
  );
};

// ── Settings Dashboard ──────────────────────────────────────────────────────

const SettingsDashboard = ({ activeYear, totalUsers }) => (
  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">School Profile</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span className="text-xs font-bold text-emerald-700">Complete</span>
      </div>
    </div>
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Year</p>
      <p className="text-sm font-extrabold text-violet-900">{activeYear || '—'}</p>
    </div>
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Users</p>
      <p className="text-sm font-extrabold text-slate-900">{totalUsers ?? '—'}</p>
    </div>
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">System Health</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span className="text-xs font-bold text-emerald-700">Online</span>
      </div>
    </div>
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Last Backup</p>
      <p className="text-sm font-extrabold text-slate-900">—</p>
    </div>
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Database</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span className="text-xs font-bold text-emerald-700">Connected</span>
      </div>
    </div>
  </div>
);

// ── System Status Panel ─────────────────────────────────────────────────────

const SystemStatusPanel = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [sRes] = await Promise.all([
          api.get('/system/settings/').catch(() => ({ data: null })),
        ]);
        setSettings(sRes.data);
        setStatus({
          database: 'Connected',
          storage: 'Operational',
          backup: 'Not configured',
          email: sRes.data?.email_service_health?.status === 'ok' ? 'Healthy' : 'Degraded',
          sync: '—',
        });
      } catch { setStatus(null); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );

  if (!status) return null;

  const items = [
    { label: 'Database Health', value: status.database, ok: status.database === 'Connected' },
    { label: 'Storage Usage', value: status.storage, ok: status.storage === 'Operational' },
    { label: 'Backup Status', value: status.backup, ok: status.backup === 'Not configured' ? true : false },
    { label: 'Email Service', value: status.email, ok: status.email === 'Healthy' },
    { label: 'Last Sync', value: status.sync, ok: true },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4">System Status</h3>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
              <span className={`text-[11px] font-bold ${item.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Navigation Definitions ──────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: 'School',
    icon: 'building',
    items: [
      { id: 'school',   label: 'School Information' },
      { id: 'academic', label: 'Academic Years' },
    ],
  },
  {
    label: 'Users & Security',
    icon: 'users',
    items: [
      { id: 'roles',    label: 'Roles & Permissions' },
      { id: 'security', label: 'Security' },
      { id: 'profile',  label: 'My Profile' },
    ],
  },
  {
    label: 'System',
    icon: 'cog',
    items: [
      { id: 'backup',   label: 'Backup Management' },
      { id: 'audit',    label: 'Audit Logs' },
      { id: 'maintenance', label: 'Maintenance Mode' },
    ],
  },
];

const EXISTING_TABS = ['school', 'academic', 'portal', 'profile', 'security'];

// ── Main Settings Component ─────────────────────────────────────────────────

const Settings = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'school' : 'profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { academicYear: activeYear } = useActiveAcademicYear();
  const [totalUsers, setTotalUsers] = useState(null);
  const [showStatusPanel, setShowStatusPanel] = useState(true);

  const userNav = useMemo(() => {
    if (!isAdmin) {
      return [{
        label: 'Account',
        icon: 'user',
        items: [
          { id: 'profile', label: 'My Profile' },
          { id: 'security', label: 'Security' },
        ],
      }];
    }
    return NAV_SECTIONS;
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/users/').then(r => {
      const data = r.data.results || r.data;
      setTotalUsers(data.length || 0);
    }).catch(() => {});
  }, [isAdmin]);

  const filteredNav = useMemo(() => {
    if (!searchQuery) return userNav;
    const q = searchQuery.toLowerCase();
    return userNav.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.label.toLowerCase().includes(q) ||
        section.label.toLowerCase().includes(q)
      ),
    })).filter(section => section.items.length > 0);
  }, [searchQuery, userNav]);

  const renderTab = () => {
    switch (activeTab) {
      case 'school':      return <SchoolInfoTab />;
      case 'academic':    return <AcademicYearsTab />;
      case 'portal':      return <PortalSettingsTab />;
      case 'profile':     return <ProfileTab />;
      case 'security':    return <SecurityTab />;
      case 'roles':       return <RolesPermissionsTab />;
      case 'comm':        return <CommunicationSettingsTab />;
      case 'backup':      return <BackupManagementTab />;
      case 'audit':       return <AuditLogsTab />;
      case 'maintenance': return <PortalSettingsTab />;
      default:            return <SchoolInfoTab />;
    }
  };

  const isPlaceholder = false;

  return (
    <div className="page-bottom-safe max-w-[1800px] mx-auto min-h-0 bg-slate-50 px-3 py-4 md:px-6 md:py-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-violet-700 uppercase tracking-wide mb-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{isAdmin ? 'System Configuration' : 'Account Settings'}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Settings & Configuration
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isAdmin ? 'Manage school configuration, academic years, and portal settings' : 'Manage your profile and account security'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowStatusPanel(v => !v)}
            className="self-start sm:self-center flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-violet-300 transition-all lg:hidden"
            aria-label="Toggle system status panel">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            System Status
          </button>
        )}
      </div>

      {/* Dashboard Summary */}
      {isAdmin && <div className="mb-5"><SettingsDashboard activeYear={activeYear} totalUsers={totalUsers} /></div>}

      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search settings..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label="Search settings"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start">
        {/* Sidebar Navigation */}
        <nav className="lg:col-span-3" aria-label="Settings navigation">
          {/* Mobile: hamburger + horizontal scroll */}
          <div className="flex items-center gap-2 lg:hidden mb-3">
            <button onClick={() => setMobileNavOpen(v => !v)}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-all"
              aria-label="Toggle settings menu"
              aria-expanded={mobileNavOpen}
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileNavOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {userNav.flatMap(s => s.items).find(i => i.id === activeTab)?.label || activeTab}
            </span>
          </div>
          {mobileNavOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileNavOpen(false)} />}
          <div className={`${mobileNavOpen ? 'fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl' : 'hidden'} lg:block lg:static lg:shadow-none overflow-y-auto`}>
            <div className={`${mobileNavOpen ? 'p-4' : ''} lg:p-0`}>
              {/* Mobile close */}
              {mobileNavOpen && (
                <div className="flex items-center justify-between mb-4 lg:hidden">
                  <span className="text-sm font-extrabold text-slate-900">Settings</span>
                  <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close menu">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              <div className="space-y-5">
                {filteredNav.map(section => (
                  <div key={section.label}>
                    <div className="flex items-center gap-2 px-3 mb-1.5">
                      <Icon name={section.icon} className="text-slate-400" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{section.label}</p>
                    </div>
                    <div className="space-y-0.5">
                      {section.items.map(item => {
                        const active = activeTab === item.id;
                        return (
                          <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                              active
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            role="tab"
                            aria-selected={active}
                            aria-controls={`settings-panel-${item.id}`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {/* Mobile: System Status inline */}
              {mobileNavOpen && isAdmin && (
                <div className="mt-6">
                  <SystemStatusPanel />
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className={`lg:col-span-6 ${isAdmin && showStatusPanel ? 'xl:col-span-6' : 'xl:col-span-9'}`}
          id={`settings-panel-${activeTab}`}
          role="tabpanel"
          aria-label={activeTab}
        >
          {renderTab()}
        </div>

        {/* Right: System Status Panel */}
        {isAdmin && showStatusPanel && (
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3">
            <div className="sticky top-4 space-y-4">
              <SystemStatusPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
