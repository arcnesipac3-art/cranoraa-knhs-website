import { useState, useEffect } from 'react';
import api from '../../utils/api';

const Field = ({ label, value, mono = false }) => (
  <div className="py-2 border-b border-slate-100 last:border-0">
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    <p className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
  </div>
);

export default function ParentProfileDrawer({ parent, students, onClose, onResetPassword, onDelete }) {
  const [tab, setTab] = useState('personal');
  const [activity, setActivity] = useState([]);
  const [completeness, setCompleteness] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const linkedStudents = (parent.profile?.linked_students || []).map(s => {
    if (typeof s === 'object') return s;
    return students.find(st => st.id === s) || { id: s, first_name: 'Student', last_name: `#${s}` };
  });

  useEffect(() => {
    if (!parent) return;
    setLoadingData(true);
    Promise.allSettled([
      api.get(`/v1/users/${parent.id}/activity/?limit=15`),
      api.get(`/v1/users/${parent.id}/profile-completeness/`),
    ]).then(([actRes, compRes]) => {
      if (actRes.status === 'fulfilled') setActivity(Array.isArray(actRes.value.data) ? actRes.value.data : []);
      if (compRes.status === 'fulfilled') setCompleteness(compRes.value.data);
    }).finally(() => setLoadingData(false));
  }, [parent?.id]);

  const fullName = `${parent.first_name} ${parent.last_name}`.trim();
  const initials = `${parent.first_name?.[0] || ''}${parent.last_name?.[0] || ''}`.toUpperCase();

  const TABS = [
    { id: 'personal', label: 'Personal' },
    { id: 'children', label: 'Children' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />

      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="bg-[#5e2a84] px-5 py-4 flex items-start gap-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-black text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white uppercase tracking-wide leading-tight truncate">{fullName}</h2>
            <p className="text-violet-200 text-xs mt-0.5 font-mono">{parent.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                parent.account_status === 'active' ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30' :
                parent.account_status === 'suspended' ? 'bg-rose-400/20 text-rose-200 border border-rose-400/30' :
                'bg-white/10 text-white/70 border border-white/20'
              }`}>{parent.account_status}</span>
              <span className="text-violet-300 text-xs">{linkedStudents.length} linked child{linkedStudents.length !== 1 ? 'ren' : ''}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Quick action bar */}
        <div className="bg-violet-950 px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-violet-900">
          <button onClick={() => onResetPassword(parent.id)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-violet-200 hover:text-white px-2.5 py-1.5 rounded hover:bg-white/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            Reset Password
          </button>
          <button onClick={() => { onDelete(parent.id, fullName); onClose(); }}
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
          {loadingData && tab === 'activity' ? (
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
                    <Field label="Email" value={parent.email} />
                    <Field label="Phone Number" value={parent.profile?.phone_number} />
                    <Field label="Address" value={parent.profile?.address} />
                    <Field label="Account Status" value={parent.account_status} />
                    <Field label="Password" value={parent.must_change_password ? 'Temporary — pending change' : 'Changed by parent'} />
                  </div>
                </div>
              )}

              {/* CHILDREN */}
              {tab === 'children' && (
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Linked Students ({linkedStudents.length})</p>
                    </div>
                    {linkedStudents.length === 0 ? (
                      <div className="p-8 text-center">
                        <svg className="w-10 h-10 text-slate-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        <p className="text-sm text-slate-400">No children linked yet</p>
                        <p className="text-xs text-slate-300 mt-1">Use Link Children to connect students</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {linkedStudents.map(s => (
                          <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                            <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-black text-violet-600">
                                {s.first_name?.[0]}{s.last_name?.[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{s.first_name} {s.last_name}</p>
                              <p className="text-[10px] text-slate-400">
                                {s.username || '—'} · {s.profile?.grade_level || s.grade_level || 'No grade'} · {s.profile?.classroom_name || 'No class'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
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
