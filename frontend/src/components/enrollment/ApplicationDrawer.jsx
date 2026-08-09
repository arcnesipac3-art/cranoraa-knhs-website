import { useState, useEffect } from 'react';
import { cn } from '../../styles/designSystem';
import { API_BASE_URL } from '../../utils/api';
import { StatusBadge } from './StatusBadge';
import { EnrollmentProgressTracker } from './EnrollmentProgressTracker';

/**
 * Slide-out drawer from the right for reviewing enrollment applications.
 * Replaces the center modal for a more modern admin experience.
 *
 * Props:
 *   application  - the selected application object (null = closed)
 *   onClose      - close handler
 *   onAction     - (id, action, opts) => Promise  - action handler
 *   classrooms   - array of classroom objects
 *   className
 */
const TABS = [
  { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'documents', label: 'Documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
];

const ApplicationDrawer = ({ application: app, onClose, onAction, classrooms = [], onRequestDocs, onAssignSection, onReject, onApprove, onEnroll, onWithdraw, onDelete, onVerifyDoc }) => {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setActiveTab('overview');
  }, [app?.id]);

  useEffect(() => {
    if (!app) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [app, onClose]);

  if (!app) return null;

  const status = app.status;

  const ALL_DOC_TYPES = [
    { field: 'birth_certificate',         docType: 'birth_certificate',        type: 'PSA Birth Certificate' },
    { field: 'report_card',               docType: 'report_card',              type: 'Report Card' },
    { field: 'form_138',                  docType: 'form_138',                 type: 'Form 138 / Grade 6 Certificate' },
    { field: 'certificate_of_completion', docType: 'certificate_of_completion',type: 'Certificate of Completion' },
    { field: 'good_moral_certificate',    docType: 'good_moral',               type: 'Good Moral Certificate' },
    { field: 'id_picture',               docType: 'id_picture',               type: 'ID Picture' },
    { field: 'last_school_attended_cert', docType: 'last_school_attended',     type: 'Last School Attended Certificate' },
  ];

  // Build doc list: merge EnrollmentDocument records with URL field fallbacks,
  // then pad with "not uploaded" placeholders so admin can see what's missing.
  const uploadedDocs = (() => {
    const docMap = new Map();
    if (app.documents && app.documents.length > 0) {
      for (const doc of app.documents) {
        if (doc.file_url) {
          docMap.set(doc.document_type, {
            ...doc,
            document_type_display: doc.document_type_display || ALL_DOC_TYPES.find(d => d.docType === doc.document_type)?.type || doc.document_type,
            verification_status_display: doc.verification_status_display || doc.verification_status,
          });
        }
      }
    }
    for (const { field, docType, type } of ALL_DOC_TYPES) {
      const url = app[field];
      if (url && typeof url === 'string' && url.length > 5 && !docMap.has(docType)) {
        docMap.set(docType, {
          id: `url-${field}`,
          document_type: docType,
          document_type_display: type,
          file_url: url,
          verification_status: 'submitted',
          verification_status_display: 'Submitted',
          _fromUrlField: true,
        });
      }
    }
    if (docMap.size > 0) {
      const missingDocs = ALL_DOC_TYPES
        .filter(({ docType }) => !docMap.has(docType))
        .map(({ field, type }) => ({
          id: `missing-${field}`,
          document_type_display: type,
          file_url: null,
          verification_status: 'missing',
          verification_status_display: 'Not Uploaded',
          _isMissing: true,
        }));
      return [...docMap.values(), ...missingDocs];
    }
    return ALL_DOC_TYPES.map(({ field, type }) => ({
      id: `missing-${field}`,
      document_type_display: type,
      file_url: null,
      verification_status: 'missing',
      verification_status_display: 'Not Uploaded',
      _isMissing: true,
    }));
  })();

  // Build a set of document_type values already covered by uploadedDocs
  // Uses docType (backend value) so the match is exact regardless of field name differences.
  const uploadedDocTypes = new Set(uploadedDocs.map(d => d.document_type));

  const missingPlaceholders = ALL_DOC_TYPES
    .filter(({ docType }) => !uploadedDocTypes.has(docType))
    .map(({ field, type }) => ({
      id: `missing-${field}`,
      document_type_display: type,
      file_url: null,
      verification_status: 'missing',
      verification_status_display: 'Not Uploaded',
      _isMissing: true,
    }));

  const docs = [...uploadedDocs, ...missingPlaceholders];

  const docsVerified = docs.every(d => d.verification_status === 'verified') ?? true;
  const docsTotal = docs.length || 0;
  const docsVerifiedCount = docs.filter(d => d.verification_status === 'verified').length || 0;

  return (
    <div className="fixed inset-0 z-[10010] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none truncate">
                {app.full_name || `${app.first_name} ${app.last_name}`}
              </h2>
              <p className="text-violet-200 text-[10px] mt-1 font-medium uppercase tracking-wide">
                {app.enrollment_number || 'No Number'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="ml-3 w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/15 hover:text-white transition-all flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status + Progress */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <StatusBadge status={status} size="md" />
            {app.assigned_classroom_name && (
              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg border border-violet-200">
                {app.assigned_classroom_name}
              </span>
            )}
          </div>
          <EnrollmentProgressTracker status={status} />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-5 flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
              {tab.id === 'documents' && docsTotal > 0 && (
                <span className={cn(
                  'ml-1 px-1.5 py-0.5 text-[8px] font-black rounded-full',
                  docsVerified === docsTotal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                )}>{docsVerifiedCount}/{docsTotal}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="p-5 space-y-4">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label="Type" value={app.enrollment_type?.replace('_', ' ') || 'New'} />
                <InfoCard label="Grade" value={`Grade ${app.grade_level}${app.strand ? ` - ${app.strand}` : ''}`} />
                <InfoCard label="School Year" value={app.school_year || 'N/A'} />
                <InfoCard label="Sex" value={app.sex || 'N/A'} />
                <InfoCard label="DOB" value={app.date_of_birth ? `${app.date_of_birth} (${app.age || '?'} yrs)` : 'N/A'} />
                <InfoCard label="LRN" value={app.lrn || (app.lrn_request_reason ? `Req: ${app.lrn_request_reason.replace(/_/g, ' ')}` : 'N/A')} />
              </div>

              {/* Address */}
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Address</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {[app.street_address, app.barangay, app.city_municipality, app.province].filter(Boolean).join(', ')}
                </p>
              </div>

              {/* Contact Info */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Contact</p>
                <div className="space-y-1.5">
                  <ContactRow icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" label={app.email} />
                  {app.phone_number && <ContactRow icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" label={app.phone_number} />}
                </div>
              </div>

              {/* Parents */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Parents / Guardian</p>
                <div className="space-y-2">
                  {app.father_name && <ParentCard name={app.father_name} contact={app.father_contact} email={app.father_email} color="emerald" label="Father" />}
                  {app.mother_name && <ParentCard name={app.mother_name} contact={app.mother_contact} email={app.mother_email} color="rose" label="Mother" />}
                  {app.guardian_name && <ParentCard name={`${app.guardian_name} (${app.guardian_relationship})`} contact={app.guardian_contact} email={app.guardian_email} color="amber" label="Guardian" />}
                  {app.linked_parent_email && (
                    <div className="bg-violet-50 p-3 rounded-xl border border-violet-200">
                      <p className="text-[9px] font-bold text-violet-600 uppercase">Linked Parent Account</p>
                      <p className="text-xs text-violet-700 font-semibold mt-0.5">{app.linked_parent_email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {app.remarks && (
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Remarks</p>
                  <p className="text-sm text-slate-700 mt-0.5">{app.remarks}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="p-5 space-y-3">
              {!docsVerified && status === 'under_review' && (
                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                  Verify all documents to enable the Approve button.
                </p>
              )}
              {docs.length > 0 ? (
                docs.map(doc => (
                <div key={doc.id} className={`p-3 rounded-xl ${doc._isMissing ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          doc.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-600' :
                          doc.verification_status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                          'bg-slate-200 text-slate-500'
                        )}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{doc.document_type_display}</p>
                          <span className={cn(
                            'text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5',
                            doc.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                            doc.verification_status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                            doc.verification_status === 'missing' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-200 text-slate-600'
                          )}>{doc.verification_status_display}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {doc.file_url && doc.id && !String(doc.id).startsWith('url-') && !String(doc.id).startsWith('missing-') ? (
                          <a href={`${API_BASE_URL}/enrollment-applications/${app.id}/documents/${doc.id}/view/`} target="_blank" rel="noreferrer"
                            className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="View document">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </a>
                        ) : doc.file_url ? (
                          <a href={doc.file_url} target="_blank" rel="noreferrer"
                            className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="View document">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </a>
                        ) : null}
                        {!doc._isMissing && doc.verification_status !== 'verified' && onVerifyDoc && (
                          <button onClick={() => onVerifyDoc(app.id, doc.id, 'verified')}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Verify">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        {!doc._isMissing && doc.verification_status !== 'rejected' && onVerifyDoc && (
                          <button onClick={() => onVerifyDoc(app.id, doc.id, 'rejected')}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Reject">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-slate-400 font-medium">No documents uploaded</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-5">
              {app.status_history && app.status_history.length > 0 ? (
                <div className="space-y-0">
                  {app.status_history.map((h, i) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2',
                          i === 0 ? 'bg-violet-500 border-violet-500' : 'bg-white border-slate-300'
                        )} />
                        {i < app.status_history.length - 1 && <div className="w-0.5 h-8 bg-slate-200" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {h.from_status_display || 'Submitted'} &rarr; {h.to_status_display}
                        </p>
                        {h.notes && <p className="text-xs text-slate-500 mt-0.5">{h.notes}</p>}
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-slate-400 font-medium">No status history yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {onRequestDocs && (
              <button onClick={() => onRequestDocs(app.id)}
                className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 rounded-lg transition-colors">
                Request Docs
              </button>
            )}
            {onAssignSection && (
              <button onClick={() => onAssignSection(app.id, app.grade_level)}
                className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 rounded-lg transition-colors">
                Set Section
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {status === 'pending' && (
              <>
                {onReject && (
                  <button onClick={() => onReject(app.id)}
                    className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-700 transition-colors">
                    Reject
                  </button>
                )}
                <button onClick={() => onAction(app.id, 'start_review', { remarks: '' })}
                  className="px-3 py-1.5 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-violet-700 transition-colors">
                  Start Review
                </button>
              </>
            )}
            {status === 'under_review' && (
              <>
                {onReject && (
                  <button onClick={() => onReject(app.id)}
                    className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-700 transition-colors">
                    Reject
                  </button>
                )}
                {onApprove && docsVerified && (
                  <button onClick={() => onApprove(app.id)}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700 transition-colors">
                    Approve
                  </button>
                )}
              </>
            )}
            {status === 'approved' && onEnroll && (
              <button onClick={() => onEnroll(app)}
                className="px-3 py-1.5 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-violet-700 transition-colors">
                Enroll Student
              </button>
            )}
            {status === 'enrolled' && onWithdraw && (
              <button onClick={() => onWithdraw(app.id)}
                className="px-3 py-1.5 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-700 transition-colors">
                Unenroll
              </button>
            )}
            {status !== 'enrolled' && onDelete && (
              <button onClick={() => onDelete(app.id, `${app.first_name} ${app.last_name}`)}
                className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-700 transition-colors">
                Delete
              </button>
            )}
            <a href={`/api/enrollment-applications/export-form-pdf/?id=${app.id}`} target="_blank" rel="noreferrer"
              className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 rounded-lg transition-colors">
              Print
            </a>
            <button onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 rounded-lg transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Small helpers ─────────────────────────────────────────────────────────────

const InfoCard = ({ label, value }) => (
  <div className="bg-slate-50 p-3 rounded-xl">
    <p className="text-[9px] font-bold text-slate-400 uppercase">{label}</p>
    <p className="text-sm font-bold text-slate-800 mt-0.5">{value}</p>
  </div>
);

const ContactRow = ({ icon, label }) => (
  <div className="flex items-center gap-2 text-sm text-slate-700">
    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
    </svg>
    <span className="font-medium">{label}</span>
  </div>
);

const ParentCard = ({ name, contact, email, color, label }) => (
  <div className={`bg-${color}-50 p-3 rounded-xl`}>
    <p className={`text-[9px] font-bold text-${color}-600 uppercase`}>{label}</p>
    <p className="text-sm font-bold text-slate-800 mt-0.5">{name}</p>
    {contact && <p className="text-xs text-slate-500">{contact}</p>}
    {email && <p className="text-[10px] text-slate-400">{email}</p>}
  </div>
);

export { ApplicationDrawer };
export default ApplicationDrawer;
