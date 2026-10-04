/**
 * StudentProfileView — full-page student profile at /people?student=<id>.
 *
 * Replaces the old drawer: deep-linkable (student id + `ptab` live in the URL),
 * back/forward friendly, and permission-checked server-side (a teacher opening
 * a non-advisory student gets a clean 404 state from the API, not a blank page).
 *
 * Tabs: overview · academic · attendance · enrollment · family · documents ·
 * account · activity — all from existing endpoints (no new backend surface).
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { API_BASE_URL } from '../../utils/api';
import { Skeleton, EmptyState } from '../../components/ui';
import { StatusDialog } from './StudentDirectory';
import { enrollmentStatus, accountStatus, normalizeGrade, formatDate, studentInitials } from './directoryHelpers';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'academic', label: 'Academic' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'family', label: 'Family' },
  { id: 'documents', label: 'Documents' },
  { id: 'account', label: 'Account' },
  { id: 'activity', label: 'Activity' },
];

const URL_DOC_FIELDS = [
  { field: 'birth_certificate', docType: 'birth_certificate', type: 'PSA Birth Certificate' },
  { field: 'report_card', docType: 'report_card', type: 'Report Card' },
  { field: 'form_138', docType: 'form_138', type: 'Form 138 / Certificate' },
  { field: 'certificate_of_completion', docType: 'certificate_of_completion', type: 'Certificate of Completion' },
  { field: 'good_moral_certificate', docType: 'good_moral', type: 'Good Moral Certificate' },
  { field: 'id_picture', docType: 'id_picture', type: 'ID Picture' },
  { field: 'last_school_attended_cert', docType: 'last_school_attended', type: 'Last School Attended Certificate' },
];

/** Merge application documents + URL fields into one checklist (old drawer logic). */
function buildDocChecklist(app) {
  const docMap = new Map();
  if (app?.documents?.length) {
    for (const doc of app.documents) {
      if (doc.file_url) {
        docMap.set(doc.document_type, {
          id: doc.id,
          document_type: doc.document_type,
          document_type_display: doc.document_type_display
            || URL_DOC_FIELDS.find(f => f.docType === doc.document_type)?.type
            || doc.document_type,
          file_url: doc.file_url,
          verification_status: doc.verification_status || 'submitted',
          verification_status_display: doc.verification_status_display || 'Submitted',
        });
      }
    }
  }
  for (const { field, docType, type } of URL_DOC_FIELDS) {
    const url = app?.[field];
    if (url && typeof url === 'string' && url.length > 5 && !docMap.has(docType)) {
      docMap.set(docType, {
        id: `url-${field}`, document_type: docType, document_type_display: type,
        file_url: url, verification_status: 'submitted', verification_status_display: 'Submitted',
      });
    }
  }
  const uploaded = [...docMap.values()];
  const missing = URL_DOC_FIELDS
    .filter(({ docType }) => !docMap.has(docType))
    .map(({ field, type }) => ({
      id: `missing-${field}`, document_type_display: type, file_url: null,
      verification_status: 'missing', verification_status_display: 'Not Uploaded',
    }));
  return [...uploaded, ...missing];
}

const Field = ({ label, value, mono = false }) => (
  <div className="py-2 border-b border-slate-100 last:border-0">
    <p className="text-[9px] font-bold text-slate-400 tracking-[0.1em] mb-0.5">{label}</p>
    <p className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono break-all' : ''}`}>{value || '—'}</p>
  </div>
);

const Panel = ({ title, children, right = null, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
      <p className="text-[10px] font-bold text-slate-500 tracking-[0.1em] uppercase">{title}</p>
      {right}
    </div>
    {children}
  </div>
);

const btnBase = 'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-[0.06em] rounded-lg transition-colors';

export default function StudentProfileView({
  userId,
  fallbackStudent = null,
  currentUser = null,
  onBack,
  onResetPassword,
  onAssignSection,
  onStartChat,
  onAwardBadge,
  onDelete,
  onChanged,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('ptab') || 'overview';
  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'overview') next.delete('ptab');
    else next.set('ptab', id);
    setSearchParams(next, { replace: true });
  };

  const [student, setStudent] = useState(fallbackStudent);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(!fallbackStudent);
  const [tabLoading, setTabLoading] = useState(true);
  const [appData, setAppData] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attend, setAttend] = useState([]);
  const [records, setRecords] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [activity, setActivity] = useState(null); // null = not fetched yet
  const [reloadKey, setReloadKey] = useState(0);
  const [statusOpen, setStatusOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const canWrite = currentUser?.role === 'admin' || currentUser?.role === 'staff';

  // ── Primary record (permission-checked server-side) ───────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!fallbackStudent) setLoading(true);
    setLoadError(null);
    api.get(`/users/${userId}/`)
      .then(res => { if (!cancelled) setStudent(res.data); })
      .catch(err => { if (!cancelled) { setLoadError(err); setStudent(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, reloadKey, fallbackStudent]);

  // ── Related data (old drawer's four sources + enrollment history) ─────────
  useEffect(() => {
    if (!student?.id) return undefined;
    let cancelled = false;
    setTabLoading(true);
    Promise.allSettled([
      api.get(`/enrollment-applications/?enrolled_student=${student.id}`),
      api.get(`/grades/?student=${student.id}`),
      api.get(`/attendance/?student=${student.id}`),
      api.get(`/record-requests/?student=${student.id}`),
      api.get(`/enrollments/?student=${student.id}`),
    ]).then(([appRes, gradeRes, attRes, recRes, enrRes]) => {
      if (cancelled) return;
      if (appRes.status === 'fulfilled') {
        const apps = appRes.value.data?.results || appRes.value.data || [];
        setAppData(Array.isArray(apps) ? apps[0] || null : null);
      }
      const rows = (r) => (r.status === 'fulfilled'
        ? (Array.isArray(r.value.data) ? r.value.data : r.value.data?.results || [])
        : []);
      setGrades(rows(gradeRes));
      setAttend(rows(attRes));
      setRecords(rows(recRes));
      setEnrollments(rows(enrRes));
    }).finally(() => { if (!cancelled) setTabLoading(false); });
    return () => { cancelled = true; };
  }, [student?.id, reloadKey]);

  // ── Activity tab (lazy, admin/staff only per backend) ─────────────────────
  useEffect(() => {
    if (tab !== 'activity' || activity !== null || !student?.id) return undefined;
    let cancelled = false;
    api.get(`/users/${student.id}/activity/`)
      .then(res => { if (!cancelled) setActivity(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (!cancelled) setActivity([]); });
    return () => { cancelled = true; };
  }, [tab, activity, student?.id]);

  const reload = useCallback(() => {
    setReloadKey(k => k + 1);
    setActivity(null);
    onChanged?.();
  }, [onChanged]);

  // ── Derived summaries ─────────────────────────────────────────────────────
  const presentCount = attend.filter(a => a.status === 'present').length;
  const lateCount = attend.filter(a => a.status === 'late').length;
  const absentCount = attend.filter(a => a.status === 'absent').length;
  const attRate = attend.length > 0
    ? Math.round(((presentCount + lateCount) / attend.length) * 100) : null;

  const finalGrades = useMemo(
    () => grades.filter(g => g.grade_type === 'final_grade' && g.raw_score != null),
    [grades],
  );
  const overallAvg = finalGrades.length
    ? (finalGrades.reduce((s, g) => s + parseFloat(g.raw_score), 0) / finalGrades.length).toFixed(1)
    : null;

  const docChecklist = useMemo(() => buildDocChecklist(appData), [appData]);

  // ── Load / error states ───────────────────────────────────────────────────
  if (loading && !student) {
    return (
      <div className="space-y-4">
        <Skeleton.PageHeader hasButton hasSearch={false} />
        <Skeleton.Table rows={6} cols={5} />
      </div>
    );
  }

  if (loadError && !student) {
    const forbidden = [403, 404].includes(loadError.response?.status);
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        <svg className="w-10 h-10 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h3 className="text-sm font-black text-slate-700">
          {forbidden ? 'Student record not available' : "Couldn't load the student"}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {forbidden
            ? 'This record either does not exist or you do not have access to it.'
            : 'A network error occurred while fetching this profile.'}
        </p>
        <button type="button" onClick={onBack} className={`${btnBase} bg-[#5e2a84] text-white hover:bg-violet-700 mx-auto`}>
          ← Back to directory
        </button>
      </div>
    );
  }

  const s = student || {};
  const profile = s.profile || {};
  const fullName = `${profile.title || ''} ${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unnamed student';
  const lrn = profile.lrn || profile.registration_number || s.username || '—';
  const grade = profile.grade_level ? normalizeGrade(profile.grade_level) : '—';
  const section = profile.classroom_name || 'No section assigned';
  const enrollStatus = profile.enrollment_status || 'active';

  const changeStatus = async (target, status, reason) => {
    await api.post(`/users/${target.id}/update-enrollment-status/`, { status, reason });
    reload();
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="bg-[#5e2a84] rounded-xl px-4 sm:px-5 py-4 flex items-start gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to directory"
          className="w-9 h-9 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
          {profile.profile_picture
            ? <img src={profile.profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
            : <span className="text-lg font-bold text-white">{studentInitials(s)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white tracking-wide leading-tight truncate">{fullName}</h1>
          <p className="text-violet-200 text-xs mt-0.5 font-mono">LRN: {lrn}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-white/25 text-white/90 bg-white/10 uppercase tracking-[0.08em]">
              {enrollmentStatus(enrollStatus).label}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-white/25 text-white/80">
              Account: {accountStatus(s.account_status).label}
            </span>
            <span className="text-violet-300 text-xs">{grade} · {section}</span>
          </div>
        </div>
      </div>

      {/* ── Action bar ── */}
      {canWrite && (
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
          <button type="button" onClick={() => onAssignSection(s)} className={`${btnBase} text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100`}>
            Set Section
          </button>
          <button type="button" onClick={() => onResetPassword(s.id)} className={`${btnBase} text-slate-600 bg-white border border-slate-200 hover:border-slate-300`}>
            Reset Password
          </button>
          <button type="button" onClick={() => setStatusOpen(true)} className={`${btnBase} text-slate-600 bg-white border border-slate-200 hover:border-slate-300`}>
            Change Status
          </button>
          {onStartChat && (
            <button type="button" onClick={() => onStartChat(s.id)} className={`${btnBase} text-slate-600 bg-white border border-slate-200 hover:border-slate-300`}>
              Message
            </button>
          )}
          <button type="button" onClick={() => onAwardBadge(s.id)} className={`${btnBase} text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100`}>
            Award Badge
          </button>
          {isAdmin && (
            <button type="button" onClick={() => onDelete(s.id)} className={`${btnBase} text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 ml-auto`}>
              Delete
            </button>
          )}
        </div>
      )}

      {/* ── Tab bar (deep-linkable via ?ptab=) ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-1 sm:px-2 flex gap-0 overflow-x-auto" role="tablist" aria-label="Student profile sections">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 sm:px-4 py-3 text-[11px] sm:text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div role="tabpanel" className={tabLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {tabLoading && tab !== 'overview' && tab !== 'account' ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 flex items-center justify-center gap-3">
            <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="text-xs text-slate-400 font-medium">Loading records…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Attendance rate', value: attRate !== null ? `${attRate}%` : '—', accent: 'text-violet-700' },
                    { label: 'Overall average', value: overallAvg || '—', accent: 'text-slate-800' },
                    { label: 'Student status', value: enrollmentStatus(enrollStatus).label, accent: 'text-emerald-700' },
                    { label: 'Record requests', value: records.length, accent: 'text-slate-800' },
                  ].map(c => (
                    <div key={c.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em]">{c.label}</p>
                      <p className={`text-xl font-black tabular-nums mt-0.5 ${c.accent}`}>{c.value}</p>
                    </div>
                  ))}
                </div>
                <Panel title="Personal information">
                  <div className="px-4">
                    <Field label="Full Name" value={fullName} />
                    <Field label="Student ID / LRN" value={lrn} mono />
                    <Field label="Date of Birth" value={profile.date_of_birth} />
                    <Field label="Sex" value={profile.sex} />
                    <Field label="Nationality" value={profile.nationality} />
                    <Field label="Address" value={profile.address} />
                    <Field label="Phone Number" value={profile.phone_number} />
                    <Field label="Email" value={s.email} />
                    <Field label="Adviser" value={profile.classroom_adviser || appData?.classroom_advisor} />
                  </div>
                </Panel>
              </>
            )}

            {/* ── ACADEMIC ── */}
            {tab === 'academic' && (
              <div className="space-y-4">
                <Panel title="Enrollment info">
                  <div className="px-4">
                    <Field label="Grade Level" value={grade} />
                    <Field label="Section / Classroom" value={section} />
                    <Field label="School Year" value={appData?.school_year} />
                    <Field label="Enrollment Type" value={appData?.enrollment_type?.replace(/_/g, ' ')} />
                    <Field label="Strand" value={appData?.strand} />
                  </div>
                </Panel>
                <Panel
                  title="Subject grades"
                  right={overallAvg ? <span className="text-sm font-black text-violet-700">Avg: {overallAvg}</span> : null}
                >
                  {finalGrades.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {finalGrades.map(g => (
                        <div key={g.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{g.subject_name}</p>
                            <p className="text-[10px] text-slate-400">T{g.quarter} · {g.academic_year}</p>
                          </div>
                          <span className={`text-sm font-bold px-3 py-1 rounded-lg border shrink-0 ${
                            parseFloat(g.raw_score) >= 90 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : parseFloat(g.raw_score) >= 75 ? 'text-blue-700 bg-blue-50 border-blue-200'
                                : 'text-rose-700 bg-rose-50 border-rose-200'
                          }`}>{g.raw_score}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No final grades recorded" description="Grades appear here once teachers post final grades for this student." />
                  )}
                </Panel>
              </div>
            )}

            {/* ── ATTENDANCE ── */}
            {tab === 'attendance' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { label: 'Present', val: presentCount, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                    { label: 'Late', val: lateCount, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                    { label: 'Absent', val: absentCount, color: 'text-rose-700 bg-rose-50 border-rose-200' },
                    { label: 'Rate', val: attRate !== null ? `${attRate}%` : '—', color: 'text-violet-700 bg-violet-50 border-violet-200' },
                  ].map(x => (
                    <div key={x.label} className={`border rounded-lg p-3 text-center ${x.color}`}>
                      <p className="text-xl font-bold tabular-nums">{x.val}</p>
                      <p className="text-[9px] font-bold tracking-wider mt-0.5">{x.label}</p>
                    </div>
                  ))}
                </div>
                <Panel title={`Recent attendance${attend.length ? ` · last ${Math.min(attend.length, 10)}` : ''}`}>
                  {attend.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {attend.slice(0, 10).map((a, i) => (
                        <div key={a.id || i} className="flex items-center justify-between px-4 py-2.5">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{a.subject_name || a.schedule_name || '—'}</p>
                            <p className="text-[10px] text-slate-400">{a.date ? formatDate(a.date) : '—'}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            a.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : a.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>{a.status || '—'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No attendance records" description="Attendance entries appear here once this student is included in a class schedule." />
                  )}
                </Panel>
              </div>
            )}

            {/* ── ENROLLMENT ── */}
            {tab === 'enrollment' && (
              <div className="space-y-4">
                <Panel title="Enrollment application">
                  {appData ? (
                    <div className="px-4">
                      <Field label="School Year" value={appData.school_year} />
                      <Field label="Type" value={appData.enrollment_type?.replace(/_/g, ' ')} />
                      <Field label="Status" value={appData.status_display || appData.status} />
                      <Field label="Submitted" value={appData.created_at ? formatDate(appData.created_at) : null} />
                    </div>
                  ) : (
                    <EmptyState title="No enrollment application on file" description="This student's account may have been created directly by the registrar." />
                  )}
                </Panel>
                <Panel title="Section history">
                  {enrollments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                          <tr>
                            <th scope="col" className="px-4 py-2">Section</th>
                            <th scope="col" className="px-4 py-2">Adviser</th>
                            <th scope="col" className="px-4 py-2">Enrolled</th>
                            <th scope="col" className="px-4 py-2 text-right">GPA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {enrollments.map(e => (
                            <tr key={e.id}>
                              <td className="px-4 py-2.5 font-bold text-slate-800">{e.classroom_name || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-500">{e.classroom_advisor || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{e.enrolled_at ? formatDate(e.enrolled_at) : '—'}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-slate-700 tabular-nums">{e.gpa ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState title="No section enrollments yet" description="Assign a section from the action bar to create the first enrollment record." />
                  )}
                </Panel>
              </div>
            )}

            {/* ── FAMILY ── */}
            {tab === 'family' && (
              <div className="space-y-4">
                {[
                  { title: 'Father', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700',
                    fields: [['Name', appData?.father_name], ['Contact', appData?.father_contact], ['Email', appData?.father_email], ['Occupation', appData?.father_occupation]] },
                  { title: 'Mother', color: 'bg-rose-50 border-rose-200', textColor: 'text-rose-700',
                    fields: [['Name', appData?.mother_name], ['Contact', appData?.mother_contact], ['Email', appData?.mother_email], ['Occupation', appData?.mother_occupation]] },
                  ...(appData?.guardian_name ? [{
                    title: 'Guardian', color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700',
                    fields: [['Name', appData.guardian_name], ['Relationship', appData.guardian_relationship], ['Contact', appData.guardian_contact]],
                  }] : []),
                ].map(({ title, color, textColor, fields }) => (
                  <div key={title} className={`rounded-xl border ${color} overflow-hidden`}>
                    <div className={`px-4 py-3 ${color}`}>
                      <p className={`text-[10px] font-bold tracking-[0.1em] uppercase ${textColor}`}>{title}</p>
                    </div>
                    <div className="px-4 bg-white divide-y divide-slate-100">
                      {fields.map(([label, val]) => (val ? <Field key={label} label={label} value={val} /> : null))}
                      {fields.every(([, v]) => !v) && <p className="py-3 text-xs text-slate-400 italic">No information provided</p>}
                    </div>
                  </div>
                ))}
                {!appData && (
                  <div className="bg-white rounded-xl border border-slate-200">
                    <EmptyState title="No enrollment application found" description="Family details are collected during enrollment, so they appear once an application exists." />
                  </div>
                )}
              </div>
            )}

            {/* ── DOCUMENTS ── */}
            {tab === 'documents' && (
              <div className="space-y-4">
                <Panel title="Required documents">
                  <div className="divide-y divide-slate-100">
                    {docChecklist.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            doc.verification_status === 'verified' ? 'bg-emerald-50'
                              : doc.verification_status === 'missing' ? 'bg-amber-50' : 'bg-slate-100'
                          }`}>
                            <svg className={`w-4 h-4 ${
                              doc.verification_status === 'verified' ? 'text-emerald-600'
                                : doc.verification_status === 'missing' ? 'text-amber-500' : 'text-slate-400'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{doc.document_type_display}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              doc.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700'
                                : doc.verification_status === 'missing' ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}>{doc.verification_status_display}</span>
                          </div>
                        </div>
                        {doc.file_url ? (
                          <a
                            href={doc.id && !String(doc.id).startsWith('url-') && !String(doc.id).startsWith('missing-')
                              ? `${API_BASE_URL}/enrollment-applications/${appData?.id}/documents/${doc.id}/view/`
                              : doc.file_url}
                            target="_blank" rel="noreferrer"
                            aria-label={`Open ${doc.document_type_display}`}
                            className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Document requests">
                  {records.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {records.map(r => (
                        <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">{r.record_type_display || r.record_type}</p>
                            <p className="text-[10px] text-slate-400">{r.purpose || ''}{r.created_at ? ` · ${formatDate(r.created_at)}` : ''}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                            ['approved', 'released'].includes(r.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : r.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No record requests" description="Requests for transcripts, certificates and other records appear here." />
                  )}
                </Panel>
              </div>
            )}

            {/* ── ACCOUNT ── */}
            {tab === 'account' && (
              <div className="space-y-4">
                <Panel
                  title="Student status"
                  right={canWrite ? (
                    <button type="button" onClick={() => setStatusOpen(true)} className="text-[11px] font-bold text-violet-600 hover:text-violet-800">
                      Change status
                    </button>
                  ) : null}
                >
                  <div className="px-4">
                    <Field label="Current status" value={enrollmentStatus(enrollStatus).label} />
                    <Field label="Status reason" value={profile.enrollment_status_reason} />
                  </div>
                </Panel>
                <Panel title="Account">
                  <div className="px-4">
                    <Field label="Login email" value={s.email} mono />
                    <Field label="Account status" value={accountStatus(s.account_status).label} />
                    <Field label="Password" value={s.must_change_password ? 'Temporary — pending change' : 'Changed by user'} />
                    <Field label="Member since" value={s.date_joined ? formatDate(s.date_joined) : null} />
                    <Field label="Last login" value={s.last_login ? new Date(s.last_login).toLocaleString() : null} />
                    <Field label="User ID" value={String(s.id ?? '—')} mono />
                  </div>
                </Panel>
              </div>
            )}

            {/* ── ACTIVITY ── */}
            {tab === 'activity' && (
              <Panel title="Audit trail">
                {activity === null ? (
                  <div className="p-8 flex justify-center">
                    <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  </div>
                ) : activity.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {activity.map(log => (
                      <div key={log.id} className="px-4 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800">
                            {log.action}
                            {log.object_repr ? <span className="font-medium text-slate-500"> · {log.object_repr}</span> : null}
                          </p>
                          {log.description && <p className="text-[11px] text-slate-400 mt-0.5">{log.description}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap tabular-nums">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No activity recorded yet" description="Actions on this account — status changes, password resets, imports — are logged here." />
                )}
              </Panel>
            )}
          </div>
        )}
      </div>

      {/* ── Status change dialog (§13) ── */}
      <StatusDialog
        student={student}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onSubmit={changeStatus}
      />
    </div>
  );
}
