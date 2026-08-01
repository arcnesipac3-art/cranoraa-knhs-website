import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { resolvePhoto } from '../../pages/Teachers';

const STAFF_TITLES = [
  { value: 'teacher_i', label: 'Teacher I' },
  { value: 'teacher_ii', label: 'Teacher II' },
  { value: 'teacher_iii', label: 'Teacher III' },
  { value: 'teacher_iv', label: 'Teacher IV' },
  { value: 'teacher_v', label: 'Teacher V' },
  { value: 'teacher_vi', label: 'Teacher VI' },
  { value: 'master_teacher_i', label: 'Master Teacher I' },
  { value: 'master_teacher_ii', label: 'Master Teacher II' },
  { value: 'special_science_teacher_i', label: 'Special Science Teacher I' },
  { value: 'als_teacher', label: 'ALS Teacher' },
  { value: 'principal', label: 'School Principal I' },
  { value: 'guidance_counselor', label: 'Guidance Counselor' },
  { value: 'administrative_officer', label: 'Administrative Officer I' },
  { value: 'admin_assistant', label: 'Administrative Assistant' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'it_staff', label: 'IT Staff' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'teacher', label: 'Teacher (Generic)' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'other', label: 'Other' },
];

function getStaffTitleLabel(value) {
  return STAFF_TITLES.find(t => t.value === value)?.label || value || 'Staff';
}

const Field = ({ label, value, mono = false }) => (
  <div className="py-2 border-b border-slate-100 last:border-0">
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    <p className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
  </div>
);

export default function TeacherProfileDrawer({ teacher, classrooms, onClose, onResetPassword, onDelete, onStartChat, currentUser }) {
  const [tab, setTab] = useState('personal');
  const [appData, setAppData] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attend, setAttend] = useState([]);
  const [activity, setActivity] = useState([]);
  const [completeness, setCompleteness] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!teacher) return;
    setLoadingData(true);
    Promise.allSettled([
      api.get(`/grades/?teacher=${teacher.id}`),
      api.get(`/attendance/?teacher=${teacher.id}`),
      api.get(`/v1/users/${teacher.id}/activity/?limit=15`),
      api.get(`/v1/users/${teacher.id}/profile-completeness/`),
    ]).then(([gradeRes, attRes, actRes, compRes]) => {
      if (gradeRes.status === 'fulfilled') setGrades(Array.isArray(gradeRes.value.data) ? gradeRes.value.data : gradeRes.value.data?.results || []);
      if (attRes.status === 'fulfilled') setAttend(Array.isArray(attRes.value.data) ? attRes.value.data : attRes.value.data?.results || []);
      if (actRes.status === 'fulfilled') setActivity(Array.isArray(actRes.value.data) ? actRes.value.data : []);
      if (compRes.status === 'fulfilled') setCompleteness(compRes.value.data);
    }).finally(() => setLoadingData(false));
  }, [teacher?.id]);

  const fullName = `${teacher.profile?.title || ''} ${teacher.first_name} ${teacher.last_name}`.trim();
  const initials = `${teacher.first_name?.[0] || ''}${teacher.last_name?.[0] || ''}`.toUpperCase();
  const photo = resolvePhoto(teacher);
  const assignedClassrooms = classrooms.filter(c => c.teacher === teacher.id);

  const TABS = [
    { id: 'personal', label: 'Personal' },
    { id: 'academic', label: 'Classes' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />

      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="bg-[#5e2a84] px-5 py-4 flex items-start gap-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {photo ? (
              <img src={photo} alt={fullName} className="w-full h-full object-cover object-top" />
            ) : (
              <span className="text-lg font-black text-white">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white uppercase tracking-wide leading-tight truncate">{fullName}</h2>
            <p className="text-violet-200 text-xs mt-0.5 font-medium">{getStaffTitleLabel(teacher.staff_title)}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                teacher.account_status === 'active' ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30' :
                teacher.account_status === 'suspended' ? 'bg-rose-400/20 text-rose-200 border border-rose-400/30' :
                'bg-white/10 text-white/70 border border-white/20'
              }`}>{teacher.account_status}</span>
              {teacher.is_adviser && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 uppercase">Adviser</span>
              )}
              {teacher.must_change_password && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30 uppercase">Temp PW</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Quick action bar */}
        <div className="bg-violet-950 px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-violet-900">
          <button onClick={() => onResetPassword(teacher.id)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-violet-200 hover:text-white px-2.5 py-1.5 rounded hover:bg-white/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            Reset Password
          </button>
          {onStartChat && (
            <button onClick={() => { onStartChat(teacher.id); onClose(); }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-violet-200 hover:text-white px-2.5 py-1.5 rounded hover:bg-white/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              Message
            </button>
          )}
          <button onClick={() => { onDelete(teacher.id); onClose(); }}
            className="flex items-center gap-1.5 text-[10px] font-bold text-rose-300 hover:text-rose-100 px-2.5 py-1.5 rounded hover:bg-rose-500/20 transition-colors ml-auto">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete
          </button>
        </div>

        {/* Profile completeness bar */}
        {completeness && (
          <div className="bg-white px-5 py-2.5 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Profile Completeness</span>
              <span className={`text-[10px] font-black ${completeness.percentage === 100 ? 'text-emerald-600' : completeness.percentage >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                {completeness.percentage}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                completeness.percentage === 100 ? 'bg-emerald-500' : completeness.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`} style={{ width: `${completeness.percentage}%` }} />
            </div>
            {completeness.missing.length > 0 && (
              <p className="text-[9px] text-slate-400 mt-1">Missing: {completeness.missing.join(', ')}</p>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div className="bg-white border-b border-slate-200 px-4 flex gap-0 flex-shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {loadingData && tab !== 'personal' ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-5 space-y-1">

              {/* PERSONAL */}
              {tab === 'personal' && (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Personal Information</p>
                  </div>
                  <div className="px-4">
                    <Field label="Full Name" value={fullName} />
                    <Field label="Staff Role" value={getStaffTitleLabel(teacher.staff_title)} />
                    {(teacher.additional_roles || '').split(',').filter(Boolean).length > 0 && (
                      <Field label="Additional Roles" value={teacher.additional_roles.split(',').filter(Boolean).map(r => getStaffTitleLabel(r)).join(', ')} />
                    )}
                    <Field label="Employee ID" value={teacher.profile?.employee_id} mono />
                    <Field label="Email" value={teacher.email} />
                    <Field label="Sex" value={teacher.profile?.sex} />
                    <Field label="Phone Number" value={teacher.profile?.phone_number} />
                    <Field label="Address" value={teacher.profile?.address} />
                    <Field label="Date of Birth" value={teacher.profile?.date_of_birth} />
                    <Field label="Account Status" value={teacher.account_status} />
                    <Field label="Password" value={teacher.must_change_password ? 'Temporary — pending change' : 'Changed by staff'} />
                  </div>
                </div>
              )}

              {/* CLASSES */}
              {tab === 'academic' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned Classrooms ({assignedClassrooms.length})</p>
                    </div>
                    {assignedClassrooms.length === 0 ? (
                      <div className="p-8 text-center">
                        <svg className="w-10 h-10 text-slate-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        <p className="text-sm text-slate-400">No classrooms assigned</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {assignedClassrooms.map(cls => (
                          <div key={cls.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{cls.name}</p>
                              <p className="text-[10px] text-slate-400">
                                Grade {cls.grade_level} · {cls.academic_level?.toUpperCase()} · {cls.student_count || 0}/{cls.capacity || 40} students
                              </p>
                            </div>
                            <span className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded uppercase">Advisory</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Summary</p>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-3">
                      <div className="border border-slate-200 rounded-lg p-3 text-center bg-violet-50">
                        <p className="text-xl font-black text-violet-700">{assignedClassrooms.length}</p>
                        <p className="text-[9px] font-bold text-violet-500 uppercase">Classrooms</p>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-3 text-center bg-emerald-50">
                        <p className="text-xl font-black text-emerald-700">{assignedClassrooms.reduce((sum, c) => sum + (c.student_count || 0), 0)}</p>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase">Students</p>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-3 text-center bg-amber-50">
                        <p className="text-xl font-black text-amber-700">{teacher.is_adviser ? 'Yes' : 'No'}</p>
                        <p className="text-[9px] font-bold text-amber-500 uppercase">Adviser</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTIVITY */}
              {tab === 'activity' && (
                <div className="space-y-3">
                  {activity.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                      <svg className="w-10 h-10 text-slate-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-sm text-slate-400">No recent activity</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {activity.map(log => (
                        <div key={log.id} className="px-4 py-3 flex gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            log.action === 'create' ? 'bg-emerald-50 text-emerald-600' :
                            log.action === 'update' ? 'bg-blue-50 text-blue-600' :
                            log.action === 'delete' ? 'bg-rose-50 text-rose-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={log.action === 'delete' ? 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' : 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'} /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 leading-tight">{log.description}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
