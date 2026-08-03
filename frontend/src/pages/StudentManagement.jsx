import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useParallelFetch } from '../hooks/useFetch';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { useScrollLock } from '../hooks/useScrollLock';
import { Skeleton, Button } from '../components/ui';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalField, ModalBtnPrimary, ModalBtnSecondary, modalInputCls, modalSelectCls } from '../components/ui/Modal';
import { AssignSectionModal } from '../components/modals/AssignSectionModal';

// ── Student Profile Drawer ─────────────────────────────────────────────────
function StudentProfileDrawer({ student, classrooms, onClose, onResetPassword, onAssignSection, onDelete, onStartChat, currentUser }) {
  const [tab, setTab] = useState('personal');
  const [appData,  setAppData]  = useState(null);
  const [grades,   setGrades]   = useState([]);
  const [attend,   setAttend]   = useState([]);
  const [records,  setRecords]  = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!student) return;
    setLoadingData(true);
    Promise.allSettled([
      api.get(`/enrollment-applications/?enrolled_student=${student.id}`),
      api.get(`/grades/?student=${student.id}`),
      api.get(`/attendance/?student=${student.id}`),
      api.get(`/record-requests/?student=${student.id}`),
    ]).then(([appRes, gradeRes, attRes, recRes]) => {
      if (appRes.status === 'fulfilled') {
        const apps = appRes.value.data?.results || appRes.value.data || [];
        setAppData(Array.isArray(apps) ? apps[0] || null : null);
      }
      if (gradeRes.status === 'fulfilled') setGrades(Array.isArray(gradeRes.value.data) ? gradeRes.value.data : gradeRes.value.data?.results || []);
      if (attRes.status  === 'fulfilled') setAttend(Array.isArray(attRes.value.data)  ? attRes.value.data  : attRes.value.data?.results  || []);
      if (recRes.status  === 'fulfilled') setRecords(Array.isArray(recRes.value.data) ? recRes.value.data : recRes.value.data?.results || []);
    }).finally(() => setLoadingData(false));
  }, [student?.id]);

  const lrn       = student.profile?.registration_number || student.username || '—';
  const fullName  = `${student.profile?.title || ''} ${student.first_name} ${student.last_name}`.trim();
  const grade     = student.profile?.grade_level || '—';
  const section   = student.profile?.classroom_name || 'No section assigned';
  const initials  = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase();

  // Attendance summary
  const presentCount = attend.filter(a => a.status === 'present').length;
  const lateCount    = attend.filter(a => a.status === 'late').length;
  const absentCount  = attend.filter(a => a.status === 'absent').length;
  const attRate = attend.length > 0
    ? Math.round(((presentCount + lateCount) / attend.length) * 100) : null;

  // Grade summary
  const finalGrades = grades.filter(g => g.grade_type === 'final_grade' && g.raw_score != null);
  const overallAvg  = finalGrades.length
    ? (finalGrades.reduce((s, g) => s + parseFloat(g.raw_score), 0) / finalGrades.length).toFixed(1) : null;

  const TABS = [
    { id: 'personal',  label: 'Personal' },
    { id: 'academic',  label: 'Academic' },
    { id: 'family',    label: 'Family' },
    { id: 'documents', label: 'Documents' },
    { id: 'records',   label: 'Records' },
  ];

  const Field = ({ label, value, mono = false }) => (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );

  const docTypeLabel = {
    birth_certificate: 'PSA Birth Certificate',
    report_card: 'Report Card',
    form_138: 'Form 138',
    certificate_of_completion: 'Certificate of Completion',
    good_moral: 'Good Moral Certificate',
    id_picture: 'ID Picture',
    last_school_attended: 'Last School Attended Cert.',
    other: 'Other Document',
  };

  return (
    <div className="fixed inset-0 z-[9999] flex">
      {/* backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* drawer */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="bg-[#5e2a84] px-5 py-4 flex items-start gap-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-black text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white uppercase tracking-wide leading-tight truncate">{fullName}</h2>
            <p className="text-violet-200 text-xs mt-0.5 font-mono">LRN: {lrn}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                student.account_status === 'active'    ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30' :
                student.account_status === 'suspended' ? 'bg-rose-400/20 text-rose-200 border border-rose-400/30' :
                'bg-white/10 text-white/70 border border-white/20'
              }`}>{student.account_status}</span>
              <span className="text-violet-300 text-xs">{grade} · {section}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Quick action bar */}
        <div className="bg-violet-950 px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-violet-900">
          <button onClick={() => onAssignSection(student.id, student.profile?.classroom_name, student.profile?.grade_level)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-violet-200 hover:text-white px-2.5 py-1.5 rounded hover:bg-white/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
            Set Section
          </button>
          <button onClick={() => onResetPassword(student.id)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-violet-200 hover:text-white px-2.5 py-1.5 rounded hover:bg-white/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            Reset Password
          </button>
          {onStartChat && (
            <button onClick={() => { onStartChat(student.id); onClose(); }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-violet-200 hover:text-white px-2.5 py-1.5 rounded hover:bg-white/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              Message
            </button>
          )}
          <button onClick={() => { onDelete(student.id); onClose(); }}
            className="flex items-center gap-1.5 text-[10px] font-bold text-rose-300 hover:text-rose-100 px-2.5 py-1.5 rounded hover:bg-rose-500/20 transition-colors ml-auto">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete
          </button>
        </div>

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

              {/* ── PERSONAL ── */}
              {tab === 'personal' && (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Personal Information</p>
                  </div>
                  <div className="px-4">
                    <Field label="Full Name" value={fullName} />
                    <Field label="Student ID / LRN" value={lrn} mono />
                    <Field label="Date of Birth" value={student.profile?.date_of_birth} />
                    <Field label="Sex" value={student.profile?.sex} />
                    <Field label="Nationality" value={student.profile?.nationality} />
                    <Field label="Address" value={student.profile?.address} />
                    <Field label="Phone Number" value={student.profile?.phone_number} />
                    <Field label="Email" value={student.email} />
                    <Field label="Account Status" value={student.account_status} />
                    <Field label="Password" value={student.must_change_password ? 'Temporary — pending change' : 'Changed by student'} />
                  </div>
                </div>
              )}

              {/* ── ACADEMIC ── */}
              {tab === 'academic' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enrollment Info</p>
                    </div>
                    <div className="px-4">
                      <Field label="Grade Level" value={grade} />
                      <Field label="Section / Classroom" value={section} />
                      <Field label="School Year" value={appData?.school_year} />
                      <Field label="Enrollment Type" value={appData?.enrollment_type?.replace(/_/g, ' ')} />
                      <Field label="Strand" value={appData?.strand} />
                    </div>
                  </div>

                  {/* Attendance summary */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Attendance Summary</p>
                    </div>
                    <div className="p-4 grid grid-cols-4 gap-3">
                      {[
                        { label: 'Present', val: presentCount, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                        { label: 'Late',    val: lateCount,    color: 'text-amber-700 bg-amber-50 border-amber-200' },
                        { label: 'Absent',  val: absentCount,  color: 'text-rose-700 bg-rose-50 border-rose-200' },
                        { label: 'Rate',    val: attRate !== null ? `${attRate}%` : '—', color: 'text-violet-700 bg-violet-50 border-violet-200' },
                      ].map(s => (
                        <div key={s.label} className={`border rounded-lg p-3 text-center ${s.color}`}>
                          <p className="text-xl font-black">{s.val}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grades */}
                  {finalGrades.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject Grades</p>
                        {overallAvg && <span className="text-sm font-black text-violet-700">Avg: {overallAvg}</span>}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {finalGrades.map(g => (
                          <div key={g.id} className="flex items-center justify-between px-4 py-2.5">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{g.subject_name}</p>
                              <p className="text-[10px] text-slate-400">T{g.quarter} · {g.academic_year}</p>
                            </div>
                            <span className={`text-sm font-black px-3 py-1 rounded-lg border ${
                              parseFloat(g.raw_score) >= 90 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                              parseFloat(g.raw_score) >= 75 ? 'text-blue-700 bg-blue-50 border-blue-200' :
                              'text-rose-700 bg-rose-50 border-rose-200'
                            }`}>{g.raw_score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                    ...(appData?.guardian_name ? [{ title: 'Guardian', color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700',
                      fields: [['Name', appData?.guardian_name], ['Relationship', appData?.guardian_relationship], ['Contact', appData?.guardian_contact]] }] : []),
                  ].map(({ title, color, textColor, fields }) => (
                    <div key={title} className={`rounded-xl border ${color} overflow-hidden`}>
                      <div className={`px-4 py-3 ${color}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${textColor}`}>{title}</p>
                      </div>
                      <div className="px-4 bg-white divide-y divide-slate-100">
                        {fields.map(([label, val]) => val ? <Field key={label} label={label} value={val} /> : null)}
                        {fields.every(([, v]) => !v) && <p className="py-3 text-xs text-slate-400 italic">No information provided</p>}
                      </div>
                    </div>
                  ))}
                  {!appData && !loadingData && (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                      <p className="text-sm text-slate-400">No enrollment application found for this student.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── DOCUMENTS ── */}
              {tab === 'documents' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-xs text-amber-800">Documents were submitted during enrollment. Click the view icon to open each file.</p>
                  </div>

                  {appData?.documents && appData.documents.length > 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {appData.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              doc.verification_status === 'verified' ? 'bg-emerald-50' :
                              doc.verification_status === 'rejected' ? 'bg-rose-50' : 'bg-slate-100'
                            }`}>
                              <svg className={`w-4 h-4 ${
                                doc.verification_status === 'verified' ? 'text-emerald-600' :
                                doc.verification_status === 'rejected' ? 'text-rose-600' : 'text-slate-400'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{docTypeLabel[doc.document_type] || doc.document_type_display || doc.document_type}</p>
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                doc.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                doc.verification_status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>{doc.verification_status_display || doc.verification_status}</span>
                            </div>
                          </div>
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noreferrer"
                              className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors flex-shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                      <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="text-sm font-semibold text-slate-400">No documents on file</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── RECORDS ── */}
              {tab === 'records' && (
                <div className="space-y-4">
                  {records.length > 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Document Requests</p>
                      </div>
                      {records.map(r => (
                        <div key={r.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{r.record_type_display || r.record_type}</p>
                            <p className="text-[10px] text-slate-400">{r.purpose || ''} · {new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            r.status === 'approved' || r.status === 'released' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            r.status === 'pending'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                      <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                      <p className="text-sm font-semibold text-slate-400">No record requests</p>
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

const StudentManagement = () => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const { data, loading, refetch } = useParallelFetch({
    students: '/users/?role=student',
    classrooms: '/classrooms/',
  });
  const students = useMemo(() => Array.isArray(data.students) ? data.students : [], [data.students]);
  const classrooms = useMemo(() => Array.isArray(data.classrooms) ? data.classrooms : [], [data.classrooms]);
  const [advisoryClass, setAdvisoryClass] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStudent, setAssignStudent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [newStudent, setNewStudent] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    grade_level: '',
    password: '',
    sex: ''
  });

  useScrollLock(showProfileModal || showAddModal || showImportModal || showAssignModal);

  const GRADE_ORDER = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

  useEffect(() => {
    if (user?.role === 'staff' && classrooms.length > 0) {
      const advisory = classrooms.find(c => String(c.teacher) === String(user.id));
      if (advisory) setAdvisoryClass(advisory);
    }
  }, [user, classrooms]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await api.post('/admin/create-user/', {
        ...newStudent,
        role: 'student',
        profile: {
          lrn: newStudent.username,
          grade_level: newStudent.grade_level,
          sex: newStudent.sex
        }
      });
      
      setShowAddModal(false);
      setNewStudent({ username: '', first_name: '', last_name: '', email: '', password: '', grade_level: '', sex: '' });
      refetch();

      Swal.fire({
        icon: 'success',
        title: 'Account Created',
        html: `
          <div class="text-left space-y-2 text-sm">
            <p><strong>Student ID:</strong> ${response.data.username}</p>
            <p><strong>Temporary Password:</strong> <span class="bg-yellow-100 px-2 py-1 rounded font-mono text-lg border border-yellow-300 select-all">${response.data.temporary_password}</span></p>
            <p class="text-xs text-slate-500 mt-4 italic">Please provide this password to the student. They will be required to change it on their first login.</p>
          </div>
        `,
        confirmButtonColor: '#5e2a84'
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const loadingToast = toast.loading('Processing file...');
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          
          const csvData = XLSX.utils.sheet_to_csv(ws);
          const blob = new Blob([csvData], { type: 'text/csv' });
          const formData = new FormData();
          formData.append('file', blob, 'import.csv');

          toast.loading('Importing students...', { id: loadingToast });
          const response = await api.post('/users/import_csv/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.dismiss(loadingToast);
          
          const { created_count, created_users, errors } = response.data;

          if (created_count > 0) {
            Swal.fire({
              icon: 'success',
              title: 'Import Successful',
              width: '90%',
              html: `
                <div class="text-left">
                  <p class="mb-4 text-sm font-bold text-emerald-600">Successfully created ${created_count} students!</p>
                    <div className="max-h-60 overflow-auto border border-slate-200 rounded">
                    <table class="w-full text-[10px] text-left">
                      <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th class="px-3 py-2">Name</th>
                          <th class="px-3 py-2">ID</th>
                          <th class="px-3 py-2">Temp Password</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        ${created_users.map(u => `
                          <tr>
                            <td class="px-3 py-2 font-bold">${u.name}</td>
                            <td class="px-3 py-2">${u.username}</td>
                            <td class="px-3 py-2 font-mono text-violet-600">${u.password}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                  <p class="mt-4 text-[10px] text-slate-500 italic">Please copy these credentials and provide them to the students.</p>
                  ${errors.length > 0 ? `
                    <div class="mt-4 p-3 bg-red-50 rounded">
                      <p class="text-[10px] font-bold text-red-600 mb-1">Errors (${errors.length}):</p>
                      <ul class="text-[9px] text-red-500 list-disc list-inside">
                        ${errors.map(e => `<li>${e}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                </div>
              `,
              confirmButtonColor: '#5e2a84'
            });
          } else if (errors.length > 0) {
            Swal.fire({
              icon: 'error',
              title: 'Import Failed',
              html: `
                <div class="text-left text-sm text-red-500">
                  <ul class="list-disc list-inside">${errors.map(e => `<li>${e}</li>`).join('')}</ul>
                </div>
              `
            });
          }
          
          setShowImportModal(false);
          refetch();
        } catch (err) {
          toast.dismiss(loadingToast);
          toast.error('Failed to parse Excel file');
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to read file');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this! All associated data (grades, attendance) will be deleted.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/users/${id}/`);
        refetch();
        toast.success('Student account deleted');
      } catch (err) {
        console.error('Failed to delete student:', err);
        toast.error('Failed to delete student');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} students?`,
      text: "This action cannot be undone. All associated data will be permanently removed.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, delete ${selectedIds.length} accounts`
    });

    if (result.isConfirmed) {
      try {
        await api.post('/users/bulk-delete/', { user_ids: selectedIds });
setSelectedIds([]);
      refetch();
        toast.success(`Successfully deleted ${selectedIds.length} students`);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to perform bulk delete');
      }
    }
  };

  const handleSelectAll = (ids, isChecked) => {
    if (isChecked) {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    } else {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  const handleResetPassword = async (studentId) => {
    const result = await Swal.fire({
      title: 'Reset Password',
      text: 'Enter a new temporary password or leave blank for auto-generation:',
      input: 'text',
      inputPlaceholder: 'New password (optional)',
      showCancelButton: true,
      confirmButtonText: 'Reset',
      confirmButtonColor: '#f59e0b',
    });

    if (result.isConfirmed) {
      try {
        const response = await api.post(`/users/${studentId}/reset_password/`, { password: result.value });
        Swal.fire({
          icon: 'success',
          title: 'Password Reset',
          html: `New temporary password: <strong>${response.data.temporary_password}</strong><br/>Please provide this to the student. They will be forced to change it on login.`,
        });
      } catch (err) {
        toast.error('Failed to reset password');
      }
    }
  };

  const handleAssignSection = (studentId, currentClassroomName, gradeLevel) => {
    const student = students.find(s => String(s.id) === String(studentId));
    if (student) {
      setAssignStudent(student);
      setShowAssignModal(true);
    }
  };

  const handleConfirmAssign = async (classroomId) => {
    if (!assignStudent) return;
    try {
      await api.post('/enrollments/assign-classroom/', {
        student: parseInt(assignStudent.id),
        classroom: parseInt(classroomId),
      });
      const classroom = classrooms.find(c => String(c.id) === String(classroomId));
      toast.success(`Assigned to ${classroom?.name || 'section'}`);
      setShowAssignModal(false);
      setAssignStudent(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail?.[0] || 'Failed to assign section');
    }
  };

  const handleStartChat = async (studentId) => {
    try {
      await api.post('/chat/rooms/get_or_create_private_chat/', { user_id: studentId });
      navigate('/communication-center');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to start chat';
      toast.error(msg);
    }
  };

  const handleToggleStatus = async (student, newStatus) => {
    try {
      const response = await api.post(`/users/${student.id}/update_status/`, { status: newStatus });
      toast.success(response.data.status);
      refetch();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleExportExcel = () => {
    const data = students.map(s => {
      const row = {
        'First Name': s.first_name,
        'Last Name': s.last_name,
        'Student ID': s.profile?.registration_number || s.username,
        'Sex': s.profile?.sex || 'N/A',
        'Classroom': s.profile?.classroom_name || 'N/A',
        'Email': s.email || '',
        'Temp Password': s.must_change_password ? 'Pending' : 'Changed',
        'Status': s.account_status
      };

      if (user?.role === 'admin') {
        return {
          ...row,
          'Grade Level': s.profile?.grade_level || 'N/A'
        };
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `students_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exported successfully');
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    const dateStr = new Date().toISOString().split('T')[0];
    
    doc.setFillColor(45, 27, 77);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text('KASIGUYAN NATIONAL HIGH SCHOOL', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text('OFFICIAL STUDENT DIRECTORY & CLASS LIST', 105, 22, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(200);
    doc.text(`Generated on: ${timestamp} | Authorized Personnel Only`, 105, 30, { align: 'center' });

    let y = 50;

    organizedData.forEach((gradeGroup) => {
      if (y > 250) { doc.addPage(); y = 20; }
      
      doc.setFillColor(243, 244, 246);
      doc.rect(14, y, 182, 10, 'F');
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(gradeGroup.grade.toUpperCase(), 16, y + 7);
      y += 15;

      gradeGroup.classrooms.forEach((cls) => {
        if (y > 250) { doc.addPage(); y = 20; }
        
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(10);
        doc.text(`SECTION: ${cls.name.toUpperCase()}`, 14, y);
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8);
        doc.text(`Total: ${cls.totalCount} Students`, 196, y, { align: 'right' });
        y += 5;

        const headers = ['#', 'STUDENT NAME', 'SEX', 'STUDENT ID / LRN', 'STATUS'];
        const colWidths = [12, 80, 20, 45, 25];
        
        const drawTable = (studentsList, title, color) => {
          if (studentsList.length === 0) return;
          
          if (y > 250) { doc.addPage(); y = 20; }
          
          doc.setFillColor(color[0], color[1], color[2], 0.1);
          doc.rect(14, y, 182, 6, 'F');
          doc.setTextColor(color[0], color[1], color[2]);
          doc.setFontSize(8);
          doc.text(title, 16, y + 4.5);
          y += 6;

          doc.setFillColor(45, 27, 77);
          doc.rect(14, y, 182, 7, 'F');
          doc.setTextColor(255);
          doc.setFont("helvetica", "bold");
          
          let x = 14;
          headers.forEach((h, i) => {
            doc.text(h, x + 2, y + 5);
            x += colWidths[i];
          });
          y += 7;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          studentsList.forEach((s, idx) => {
            if (y > 275) {
              doc.addPage();
              y = 20;
              doc.setFillColor(45, 27, 77);
              doc.rect(14, y, 182, 7, 'F');
              doc.setTextColor(255);
              let rx = 14;
              headers.forEach((h, i) => { doc.text(h, rx + 2, y + 5); rx += colWidths[i]; });
              y += 7;
            }

            doc.setTextColor(0);
            if (idx % 2 === 0) {
              doc.setFillColor(249, 250, 251);
              doc.rect(14, y, 182, 7, 'F');
            }

            const name = `${s.last_name}, ${s.first_name}`.toUpperCase();
            const lrn = s.profile?.registration_number || s.username || '—';
            const sex = (s.profile?.sex || 'N/A').toUpperCase();
            const status = s.account_status.toUpperCase();

            let cx = 14;
            doc.text(String(idx + 1), cx + 2, y + 5); cx += colWidths[0];
            doc.text(name.substring(0, 45), cx + 2, y + 5); cx += colWidths[1];
            doc.text(sex, cx + 2, y + 5); cx += colWidths[2];
            doc.text(String(lrn), cx + 2, y + 5); cx += colWidths[3];
            
            if (status === 'ACTIVE') doc.setTextColor(16, 185, 129);
            else if (status === 'SUSPENDED') doc.setTextColor(239, 68, 68);
            else doc.setTextColor(107, 114, 128);
            
            doc.text(status, cx + 2, y + 5);
            
            y += 7;
          });
          y += 5;
        };

        drawTable(cls.male, `MALE STUDENTS (${cls.male.length})`, [59, 130, 246]);
        drawTable(cls.female, `FEMALE STUDENTS (${cls.female.length})`, [236, 72, 153]);
        
        y += 10;
      });
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      doc.text('KASIGUYAN NATIONAL HIGH SCHOOL - SYSTEM GENERATED REPORT', 20, 290);
    }

    doc.save(`KNHS_Student_Directory_${dateStr}.pdf`);
    toast.success('Professional PDF directory generated');
  };

  const organizedData = useMemo(() => {
    const normalizeGrade = (g) => {
      if (!g || g === 'Unassigned') return 'Unassigned';
      if (/^\d+$/.test(g)) return `Grade ${g}`;
      return g;
    };

    const filtered = students.filter(s => {
      const search = searchQuery.toLowerCase();
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
      const lrn = (s.profile?.registration_number || s.username || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const matchesSearch = !search || email.includes(search) || fullName.includes(search) || lrn.includes(search);
      const matchesGrade = !gradeFilter || normalizeGrade(s.profile?.grade_level) === gradeFilter;
      const matchesStatus = !statusFilter || s.account_status === statusFilter;
      return matchesSearch && matchesGrade && matchesStatus;
    });

    const groups = {};

    filtered.forEach(s => {
      let grade = normalizeGrade(s.profile?.grade_level);
      let classroom = s.profile?.classroom_name || 'No Classroom';
      
      if (user?.role === 'staff' && advisoryClass) {
        if (!grade || grade === 'Unassigned') {
          const match = advisoryClass.name?.match(/Grade\s+(\d+)/i);
          grade = match ? `Grade ${match[1]}` : (advisoryClass.grade_level || 'Unassigned');
        }
        classroom = advisoryClass.name;
      }
      
      if (!groups[grade]) groups[grade] = {};
      if (!groups[grade][classroom]) groups[grade][classroom] = [];
      groups[grade][classroom].push(s);
    });

    const sortedGrades = Object.keys(groups).sort((a, b) => {
      const indexA = GRADE_ORDER.indexOf(a);
      const indexB = GRADE_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return sortedGrades.map(grade => ({
      grade,
      classrooms: Object.keys(groups[grade]).sort().map(classroom => {
        const classStudents = groups[grade][classroom];
        
        const sorted = [...classStudents].sort((a, b) => 
          (a.last_name || '').localeCompare(b.last_name || '')
        );

        return {
          name: classroom,
          male: sorted.filter(s => (s.profile?.sex || '').toLowerCase() === 'male'),
          female: sorted.filter(s => (s.profile?.sex || '').toLowerCase() === 'female'),
          totalCount: classStudents.length
        };
      })
    }));
  }, [students, searchQuery, gradeFilter, statusFilter]);

  if (loading) {
    return (
      <div className="space-y-5 px-4 md:px-6 py-6">
        <Skeleton.PageHeader />
        <Skeleton.CardGrid count={6} cols={3} />
      </div>
    );
  }

  const ProfileField = ({ label, value }) => (
    <div className="py-1 sm:py-2 border-b border-slate-100 last:border-0">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xs font-bold text-slate-700 truncate">{value || '—'}</p>
    </div>
  );

  const StudentRow = ({ student, idx }) => {
    const btnRef = useRef(null);
    const menuRef = useRef(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
      if (openMenuId === student.id && btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        const menuH = 180;
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = spaceBelow < menuH ? rect.top - menuH - 4 : rect.bottom + 4;
        const left = Math.min(rect.left, window.innerWidth - 180);
        setMenuPos({ top, left });
      }
    }, [openMenuId, student.id]);

    return (
    <tr key={student.id} className={`group transition-colors ${selectedIds.includes(student.id) ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
      <td className="px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={selectedIds.includes(student.id)}
            onChange={(e) => {
              if (e.target.checked) setSelectedIds(prev => [...prev, student.id]);
              else setSelectedIds(prev => prev.filter(id => id !== student.id));
            }}
            className="w-3.5 h-3.5 text-violet-600 border-slate-300 rounded focus:ring-violet-500 cursor-pointer"
          />
          <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
        </div>
      </td>
      <td className="px-3 py-2 md:px-4 md:py-3">
        <p className="text-xs font-bold text-slate-800 truncate uppercase">
          {student.last_name}, {student.first_name}
        </p>
      </td>
      <td className="hidden sm:table-cell px-4 py-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase">{student.profile?.sex || '—'}</span>
      </td>
      <td className="hidden lg:table-cell px-4 py-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 border ${
          student.profile?.classroom_name 
            ? 'text-slate-700 bg-slate-50 border-slate-200' 
            : 'text-amber-600 bg-amber-50 border-amber-200'
        }`}>{student.profile?.classroom_name || 'No Section'}</span>
      </td>
      <td className="hidden lg:table-cell px-4 py-3">
        <p className="text-[10px] font-medium text-slate-500 truncate max-w-[150px] lowercase">{student.email || '—'}</p>
      </td>
      <td className="hidden md:table-cell px-4 py-3">
        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-50 px-2 py-0.5 border border-slate-200">
          {student.profile?.registration_number || student.username}
        </span>
      </td>
      <td className="px-3 py-2 md:px-4 md:py-3 text-center">
        <select 
          value={student.account_status} 
          onChange={(e) => handleToggleStatus(student, e.target.value)}
          className={`text-[10px] font-bold px-1.5 py-0.5 border uppercase tracking-wide cursor-pointer focus:ring-1 focus:ring-violet-500 ${
            student.account_status === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 
            student.account_status === 'suspended' ? 'text-rose-600 bg-rose-50 border-rose-200' : 
            'text-slate-500 bg-slate-50 border-slate-200'
          }`}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </td>
      <td className="px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center justify-center">
          <button
            ref={el => { if (openMenuId === student.id) btnRef.current = el; }}
            onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>
          </button>
          {openMenuId === student.id && createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setOpenMenuId(null)} />
              <div
                ref={menuRef}
                className="fixed w-44 bg-white border border-slate-200 shadow-lg py-1 z-[9999]"
                style={menuPos}
              >
                <button
                  onClick={() => { setSelectedStudent(student); setShowProfileModal(true); setOpenMenuId(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  View Profile
                </button>
                {(user?.role === 'admin' || user?.role === 'staff') && (
                  <button
                    onClick={() => { handleAssignSection(student.id, student.profile?.classroom_name, student.profile?.grade_level); setOpenMenuId(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Set Section
                  </button>
                )}
                <button
                  onClick={() => { handleResetPassword(student.id); setOpenMenuId(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  Reset Password
                </button>
                {(user?.role === 'admin' || user?.role === 'staff') && (
                  <button
                    onClick={() => { handleDelete(student.id); setOpenMenuId(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-left"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete Account
                  </button>
                )}
              </div>
            </>,
            document.body
          )}
        </div>
      </td>
    </tr>
    );
  };

  return (
    <div className="page-bottom-safe bg-slate-50">
      {/* Official Header */}
      <div className="bg-white border-b-2 border-slate-200 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 bg-[#5e2a84] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 uppercase tracking-wide">
              {user?.role === 'staff' ? 'Advisory Class' : 'Student Records'}
            </h1>
            <p className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {user?.role === 'staff' ? 'Manage Advisory Students' : 'Student Management System'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 md:px-6 space-y-3 md:space-y-4">
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
        <div className="flex-1"></div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#5e2a84] text-white px-2.5 py-1.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 border border-violet-800 hover:bg-violet-700 flex items-center gap-1.5 transition-colors text-xs font-bold uppercase tracking-wide"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add Student
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 hover:bg-slate-50 flex items-center gap-1.5 transition-colors text-xs font-bold uppercase tracking-wide"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            Import
          </button>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                const headers = [['Student ID', 'First Name', 'Last Name', 'Grade Level', 'Sex', 'Email']];
                const sampleData = [
                  ['128150150092', 'Arc', 'Capisen', 'Grade 12', 'Male', ''],
                  ['128150150093', 'Arcc', 'Capisenq', 'Grade 12', 'Female', ''],
                  ['128150150094', 'Arcy', 'Capisenw', 'Grade 12', 'Male', ''],
                ];
                
                const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
                const headerRange = XLSX.utils.decode_range(ws['!ref']);
                for (let C = headerRange.s.c; C <= 5; ++C) {
                  const address = XLSX.utils.encode_col(C) + '1';
                  if (!ws[address]) continue;
                  ws[address].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "5e2a84" } },
                    alignment: { horizontal: "center" }
                  };
                }
                ws['!cols'] = [
                  { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 30 },
                ];
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Student Template");
                XLSX.writeFile(wb, "KNHS_Student_Import_Template.xlsx");
                toast.success('Template downloaded');
              }}
              className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 hover:bg-slate-50 flex items-center gap-1.5 transition-colors text-xs font-bold uppercase tracking-wide"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Template
            </button>
            
            <div className="relative group/info">
              <button className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors text-xs font-bold">
                ?
              </button>
              <div className="absolute top-full right-0 mt-2 w-64 p-4 bg-slate-900 text-white rounded shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-[110]">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-violet-400 mb-3 border-b border-white/10 pb-2">Import Instructions</h4>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <span className="text-violet-400 font-bold text-[10px]">01</span>
                    <p className="text-[10px] leading-relaxed text-slate-300">Student ID must be exactly <span className="text-white">12 digits (LRN)</span>.</p>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-violet-400 font-bold text-[10px]">02</span>
                    <p className="text-[10px] leading-relaxed text-slate-300">Email is <span className="text-white">optional</span>.</p>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-violet-400 font-bold text-[10px]">03</span>
                    <p className="text-[10px] leading-relaxed text-slate-300">Grade Level: <span className="text-white">Grade 7 to Grade 12</span>.</p>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-violet-400 font-bold text-[10px]">04</span>
                    <p className="text-[10px] leading-relaxed text-slate-300">Do <span className="text-rose-400">NOT</span> change the header names.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-white p-0.5 border border-slate-200 rounded-lg overflow-hidden">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-2 py-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors border-r border-slate-200"
              title="Export as Excel spreadsheet"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Excel</span>
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-1 px-2 py-1.5 text-rose-600 hover:bg-rose-50 transition-colors"
              title="Export as PDF document"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">PDF</span>
            </button>
          </div>
          <div className="bg-white px-2.5 py-1.5 sm:px-3 md:px-4 md:py-2 border border-slate-200 flex items-center gap-2">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {user?.role === 'staff' ? 'Advisory Students' : 'Total Students'}
              </p>
              <p className="text-sm font-black text-slate-800 leading-none">{students.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2 sm:p-2.5 md:p-3 border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search name, email, or LRN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:bg-white text-xs font-medium transition-colors" 
            />
          </div>
          <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500">
            <option value="">All Grades</option>
            {['Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 border border-violet-200 uppercase tracking-wide">
                {selectedIds.length} Selected
              </span>
              <button 
                onClick={handleBulkDelete}
                className="bg-rose-500 text-white px-3 py-1.5 border border-rose-600 hover:bg-rose-600 flex items-center gap-1.5 transition-colors text-xs font-bold uppercase tracking-wide"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Bulk Delete
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-wide"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Organized List */}
      <div className="space-y-3 sm:space-y-4 md:space-y-6 pb-4 sm:pb-6 md:pb-10">
        {organizedData.length === 0 ? (
          <div className="bg-white border border-slate-200 p-6 sm:p-10 md:p-16 text-center">
            <div className="w-12 h-12 bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-black text-slate-700 mb-1 uppercase tracking-wide">No Students Found</h3>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Try a different search.</p>
          </div>
        ) : (
          organizedData.map((gradeGroup) => (
            <div key={gradeGroup.grade} className="space-y-1.5 sm:space-y-2 md:space-y-4">
              {user?.role === 'admin' && (
                <div className="flex items-center gap-2 px-1">
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide">{gradeGroup.grade}</h2>
                  <div className="h-px flex-1 bg-slate-200"></div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4">
                {gradeGroup.classrooms.map((cls) => (
                  <div key={cls.name} className="bg-white border border-slate-200">
                    <div className="px-2.5 py-2 sm:px-3 md:px-4 md:py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#5e2a84] flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h3 className="font-black text-slate-700 text-xs uppercase tracking-wide">{cls.name}</h3>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200 uppercase tracking-widest">
                        {cls.totalCount} Students
                      </span>
                    </div>

                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left min-w-[320px]">
                        <thead>
                          <tr className="text-[9px] font-bold text-white uppercase tracking-widest bg-[#5e2a84]">
                            <th className="px-2.5 py-2 sm:px-3 md:px-4 md:py-2.5 w-10">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  checked={cls.male.concat(cls.female).every(s => selectedIds.includes(s.id)) && (cls.male.length + cls.female.length) > 0}
                                  onChange={(e) => handleSelectAll(cls.male.concat(cls.female).map(s => s.id), e.target.checked)}
                                  className="w-3 h-3 text-violet-600 border-slate-300 rounded focus:ring-violet-500 cursor-pointer"
                                />
                                <span>#</span>
                              </div>
                            </th>
                            <th className="px-3 py-2 md:px-4 md:py-2.5">Student</th>
                            <th className="hidden sm:table-cell px-4 py-2.5">Sex</th>
                            <th className="hidden lg:table-cell px-4 py-2.5">Section</th>
                            <th className="hidden lg:table-cell px-4 py-2.5">Email</th>
                            <th className="hidden md:table-cell px-4 py-2.5">LRN</th>
                            <th className="px-3 py-2 md:px-4 md:py-2.5 text-center">Status</th>
                            <th className="px-3 py-2 md:px-4 md:py-2.5 text-center w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* Male Students */}
                          {cls.male.length > 0 && (
                            <tr className="bg-blue-50">
                              <td colSpan="7" className="px-4 py-1.5 text-[9px] font-bold text-blue-600 uppercase tracking-widest border-y border-blue-100">
                                <div className="flex items-center gap-1.5">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9H5v2h4v4h2v-4h4V9h-4V5H9v4z" /></svg>
                                  Male ({cls.male.length})
                                </div>
                              </td>
                            </tr>
                          )}
                          {cls.male.map((student, idx) => (
                            <StudentRow key={student.id} student={student} idx={idx} />
                          ))}

                          {/* Female Students */}
                          {cls.female.length > 0 && (
                            <tr className="bg-rose-50">
                              <td colSpan="7" className="px-4 py-1.5 text-[9px] font-bold text-rose-600 uppercase tracking-widest border-y border-rose-100">
                                <div className="flex items-center gap-1.5">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9H5v2h4v4h2v-4h4V9h-4V5H9v4z" /></svg>
                                  Female ({cls.female.length})
                                </div>
                              </td>
                            </tr>
                          )}
                          {cls.female.map((student, idx) => (
                            <StudentRow key={student.id} student={student} idx={idx} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Student Profile Drawer ── */}
      {showProfileModal && selectedStudent && (
        <StudentProfileDrawer
          student={selectedStudent}
          classrooms={classrooms}
          onClose={() => { setShowProfileModal(false); setSelectedStudent(null); }}
          onResetPassword={handleResetPassword}
          onAssignSection={handleAssignSection}
          onDelete={handleDelete}
          onStartChat={handleStartChat}
          currentUser={user}
        />
      )}

      {/* Add Student Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="md">
        <ModalHeader onClose={() => setShowAddModal(false)}>
          <ModalTitle title="Add New Student" subtitle="Create Student Account" />
        </ModalHeader>
        <form onSubmit={handleAddStudent}>
          <ModalBody className="space-y-3">
            <ModalField label="Student ID (LRN)" required>
              <input required value={newStudent.username} onChange={e => setNewStudent({...newStudent, username: e.target.value})}
                placeholder="12-digit LRN" className={modalInputCls} />
            </ModalField>
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="First Name" required>
                <input required value={newStudent.first_name} onChange={e => setNewStudent({...newStudent, first_name: e.target.value})}
                  className={modalInputCls} />
              </ModalField>
              <ModalField label="Last Name" required>
                <input required value={newStudent.last_name} onChange={e => setNewStudent({...newStudent, last_name: e.target.value})}
                  className={modalInputCls} />
              </ModalField>
            </div>
            <ModalField label="Email" hint="Optional">
              <input type="email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                className={modalInputCls} />
            </ModalField>
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Grade Level" required>
                <select required value={newStudent.grade_level} onChange={e => setNewStudent({...newStudent, grade_level: e.target.value})}
                  className={modalSelectCls}>
                  <option value="">Select Grade</option>
                  {['7','8','9','10','11','12'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </ModalField>
              <ModalField label="Sex" required>
                <select required value={newStudent.sex} onChange={e => setNewStudent({...newStudent, sex: e.target.value})}
                  className={modalSelectCls}>
                  <option value="">Select Sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </ModalField>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalBtnSecondary onClick={() => setShowAddModal(false)}>Cancel</ModalBtnSecondary>
            <ModalBtnPrimary loading={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Account'}</ModalBtnPrimary>
          </ModalFooter>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} size="md">
        <ModalHeader onClose={() => setShowImportModal(false)}>
          <ModalTitle title="Import Students" subtitle="Upload Excel File" />
        </ModalHeader>
        <ModalBody>
          <div className={`border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
            isDragging ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-slate-400'
          }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files.length > 0) {
                handleImportExcel({ target: { files: e.dataTransfer.files } });
              }
            }}>
            <svg className="w-8 h-8 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-bold text-slate-700 mb-1">Drop Excel file here or click to browse</p>
            <p className="text-xs text-slate-400">Supports .xlsx, .xls, .csv</p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel}
              className="hidden" id="import-input" />
            <label htmlFor="import-input"
              className="mt-4 inline-block px-4 py-2 bg-[#5e2a84] text-white text-xs font-bold uppercase tracking-wider hover:bg-violet-700 cursor-pointer transition-colors">
              Select File
            </label>
          </div>
        </ModalBody>
      </Modal>
      </div>

      <AssignSectionModal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setAssignStudent(null); }}
        onConfirm={handleConfirmAssign}
        student={assignStudent}
        classrooms={classrooms}
        title="Assign Section"
        confirmText="Assign"
      />
    </div>
  );
};

export default StudentManagement;
