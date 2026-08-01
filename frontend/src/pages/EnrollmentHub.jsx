import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParallelFetch } from '../hooks/useFetch';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { LoadingSpinner, Button } from '../components/ui';
import { AssignSectionModal } from '../components/modals/AssignSectionModal';
import { ApplicationDrawer } from '../components/enrollment/ApplicationDrawer';
import { ApplicationsTableSkeleton, ClassroomGridSkeleton, EnrolledListSkeleton } from '../components/enrollment/Skeletons';

const STATUS_CONFIG = {
  pending: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pending' },
  under_review: { color: 'bg-violet-100 text-violet-800 border-violet-200', label: 'Under Review' },
  pending_requirements: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Pending Req' },
  approved: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Approved' },
  rejected: { color: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Rejected' },
  cancelled: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Cancelled' },
  enrolled: { color: 'bg-violet-100 text-violet-800 border-violet-200', label: 'Enrolled' },
};

const GRADE_LEVELS = ['', '7', '8', '9', '10', '11', '12'];
const ENROLLMENT_TYPES = ['', 'new', 'returning', 'transferee', 'sh_applicant', 'parent_assisted'];

function ApplicationsTab({ refetch }) {
  const { data, loading, refetch: localRefetch } = useParallelFetch({
    applications: '/enrollment-applications/',
    analytics: '/enrollment-applications/analytics/',
    classrooms: '/classrooms/',
  });
  const applications = useMemo(() => data.applications?.results || data.applications || [], [data.applications]);
  const analytics = data.analytics || null;
  const classrooms = useMemo(() => data.classrooms?.results || data.classrooms || [], [data.classrooms]);

  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filter, setFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [schoolYearFilter, setSchoolYearFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollApp, setEnrollApp] = useState(null);
  const [enrollClassroom, setEnrollClassroom] = useState('');
  const [enrollParentEmail, setEnrollParentEmail] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignApp, setAssignApp] = useState(null);

  const schoolYears = useMemo(() => {
    const years = new Set(applications.map(a => a.school_year).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [applications]);

  const handleAction = async (id, action, opts = {}) => {
    try {
      const res = action === 'delete_application'
        ? await api.delete(`/enrollment-applications/${id}/delete_application/`)
        : await api.post(`/enrollment-applications/${id}/${action}/`, opts);
      Swal.fire({ icon: 'success', title: 'Done', text: res.data?.status || res.data?.message || 'Action completed.' });
      localRefetch();
      try {
        const fresh = await api.get(`/enrollment-applications/${id}/`);
        setSelected(fresh.data);
      } catch {
        if (selected?.id === id && action !== 'enroll_student') setSelected(null);
      }
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.detail
        || err.response?.data?.message
        || (typeof err.response?.data === 'string' ? err.response.data : '')
        || `Action failed (${err.response?.status || 'network error'})`;
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
      throw err;
    }
  };

  const promptDelete = async (id, name) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Delete Application?',
      html: `<p>Are you sure you want to delete the application for <strong>${name}</strong>?</p><p class="text-xs text-rose-500 mt-2">This action cannot be undone.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#EF4444',
    });
    if (isConfirmed) handleAction(id, 'delete_application');
  };

  const handleView = async (app) => {
    setSelected(app);
    if (app.status === 'pending') {
      try {
        const res = await api.post(`/enrollment-applications/${app.id}/start-review/`, { remarks: '' });
        setSelected({ ...app, status: 'under_review' });
        refetch();
      } catch {}
    }
  };

  const promptApproveApplication = async (id) => {
    const { value } = await Swal.fire({
      title: 'Approve Application?', input: 'textarea', inputLabel: 'Remarks',
      inputPlaceholder: 'Optional remarks...', showCancelButton: true, confirmButtonText: 'Approve',
      confirmButtonColor: '#10B981',
    });
    if (value !== undefined) handleAction(id, 'approve_application', { remarks: value });
  };

  const promptReject = async (id) => {
    const { value } = await Swal.fire({
      title: 'Reject Application', input: 'textarea', inputLabel: 'Reason for rejection',
      inputPlaceholder: 'Required: provide a reason...', showCancelButton: true,
      confirmButtonText: 'Reject', confirmButtonColor: '#EF4444',
      preConfirm: (v) => { if (!v) { Swal.showValidationMessage('Reason required'); } },
    });
    if (value) handleAction(id, 'reject', { remarks: value });
  };

  const promptWithdraw = async (id) => {
    const { value: reason } = await Swal.fire({
      title: 'Withdraw / Unenroll Student', input: 'textarea', inputLabel: 'Reason',
      inputPlaceholder: 'e.g. Transferred out, Withdrawn by parent, Removed...', showCancelButton: true,
      confirmButtonText: 'Unenroll', confirmButtonColor: '#F59E0B',
      preConfirm: (v) => { if (!v) { Swal.showValidationMessage('Reason required'); } },
    });
    if (reason) {
      const { value: reasonType } = await Swal.fire({
        title: 'Reason Type', input: 'select', inputOptions: {
          transferred_out: 'Transferred Out',
          withdrawn: 'Withdrawn',
          removed: 'Removed',
          other: 'Other',
        }, inputPlaceholder: 'Select reason type', showCancelButton: true,
        confirmButtonText: 'Confirm', confirmButtonColor: '#F59E0B',
      });
      if (reasonType !== undefined) handleAction(id, 'withdraw_student', { remarks: reason, reason_type: reasonType });
    }
  };

  const promptRequestDocs = async (id) => {
    const { value } = await Swal.fire({
      title: 'Request Requirements', html: `
        <textarea id="msg" class="swal2-textarea" placeholder="Message to applicant...">Please submit the missing documents.</textarea>
        <div class="text-left mt-3 text-xs font-bold text-slate-500">Document types to flag as missing:</div>
        <div class="flex flex-wrap gap-2 mt-2" id="doc-types">
          ${['Birth Cert','Report Card','Form 138','Completion Cert','Good Moral','ID Picture'].map((l, i) =>
            `<label class="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" class="doc-cb" value="${['birth_certificate','report_card','form_138','certificate_of_completion','good_moral','id_picture'][i]}"> ${l}</label>`
          ).join('')}
        </div>
      `, showCancelButton: true, confirmButtonText: 'Send', confirmButtonColor: '#F59E0B',
      preConfirm: () => {
        const msg = document.getElementById('msg').value;
        const types = [...document.querySelectorAll('.doc-cb:checked')].map(c => c.value);
        return { message: msg, document_types: types };
      }
    });
    if (value) handleAction(id, 'request_requirements', value);
  };

  const enrollStudent = async () => {
    if (!enrollApp || enrolling) return;

    // Warn if no section selected — student will be enrolled without a classroom
    if (!enrollClassroom) {
      const { isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: 'No Section Selected',
        html: `<p class="text-sm text-slate-700">You are enrolling <strong>${enrollApp.first_name} ${enrollApp.last_name}</strong> without assigning a section.</p>
               <p class="text-xs text-amber-600 mt-2 font-bold">The student will have an account but won't appear in any class roster. You can assign a section later from the Enroll Students tab.</p>`,
        showCancelButton: true,
        confirmButtonText: 'Enroll Anyway',
        cancelButtonText: 'Go Back',
        confirmButtonColor: '#7C3AED',
      });
      if (!isConfirmed) return;
    }

    setEnrolling(true);
    try {
      const result = await handleAction(enrollApp.id, 'enroll_student', {
        classroom_id: enrollClassroom || '', parent_email: enrollParentEmail || '',
      });
      if (result?.temp_password) {
        Swal.fire({
          icon: 'success', title: 'Student Enrolled!', html: `
            <div class="text-left space-y-2">
              <p><strong>Email:</strong> ${enrollApp.email}</p>
              <p><strong>LRN:</strong> ${enrollApp.lrn || 'N/A'}</p>
              <p><strong>Password:</strong> ${result.temp_password}</p>
              ${result.classroom_name ? `<p><strong>Section:</strong> ${result.classroom_name}</p>` : ''}
              <p class="text-xs text-amber-600 font-bold mt-3">This is a temporary password. Student must change it on first login.</p>
            </div>
          `, confirmButtonText: 'OK', width: 400,
        });
      }
      setShowEnrollModal(false);
      setEnrollApp(null);
      setEnrollClassroom('');
      setEnrollParentEmail('');
    } catch (err) {
      // Error already shown by handleAction
    } finally {
      setEnrolling(false);
    }
  };

  const assignSection = async (id, gradeLevel) => {
    const app = applications.find(a => String(a.id) === String(id));
    if (app) {
      setAssignApp({ ...app, grade_level: gradeLevel });
      setShowAssignModal(true);
    }
  };

  const handleConfirmAssign = async (classroomId) => {
    if (!assignApp) return;
    try {
      await handleAction(assignApp.id, 'assign_section', { classroom_id: classroomId });
      setShowAssignModal(false);
      setAssignApp(null);
    } catch (err) {
      // Error already handled by handleAction
    }
  };

  const verifyDoc = async (appId, docId, status) => {
    const endpoint = status === 'verified' ? 'verify_document' : 'reject_document';
    let notes = '';
    if (status === 'rejected') {
      const { value } = await Swal.fire({ title: 'Reason for rejection', input: 'textarea', showCancelButton: true, confirmButtonText: 'Reject', confirmButtonColor: '#EF4444' });
      if (!value) return;
      notes = value;
    }
    try {
      await api.post(`/enrollment-applications/${appId}/${endpoint}/`, { document_id: docId, notes });
      setSelected(prev => {
        if (!prev || prev.id !== appId) return prev;
        return {
          ...prev,
          documents: prev.documents.map(d =>
            d.id === docId ? { ...d, verification_status: status, verification_status_display: status === 'verified' ? 'Verified' : 'Rejected' } : d
          ),
        };
      });
      Swal.fire({ icon: 'success', title: 'Done', text: `Document ${status}`, timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Failed' });
    }
  };

  const downloadFile = async (endpoint, filename) => {
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Export Failed', text: err.response?.data?.error || 'Failed to download file.' });
    }
  };

  const handleExportCSV = () => downloadFile(
    '/enrollment-applications/export_csv/',
    `enrollment_applications_${new Date().toISOString().slice(0,10)}.csv`
  );

  const handleExportPDF = () => downloadFile(
    '/enrollment-applications/export-summary-pdf/',
    `enrollment_summary_${new Date().toISOString().slice(0,10)}.pdf`
  );

  const filtered = useMemo(() => applications.filter(app => {
    if (filter !== 'all' && app.status !== filter) return false;
    if (gradeFilter && app.grade_level !== gradeFilter) return false;
    if (typeFilter && app.enrollment_type !== typeFilter) return false;
    if (schoolYearFilter && app.school_year !== schoolYearFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!app.first_name.toLowerCase().includes(q) && !app.last_name.toLowerCase().includes(q) && !app.email.toLowerCase().includes(q) && !(app.enrollment_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [applications, filter, gradeFilter, typeFilter, schoolYearFilter, searchTerm]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const bulkAction = async (action) => {
    if (!selectedIds.length) { Swal.fire({ icon: 'warning', text: 'Select applications first.' }); return; }
    const confirmed = await Swal.fire({ title: `${action} ${selectedIds.length} application(s)?`, showCancelButton: true, confirmButtonText: 'Confirm', confirmButtonColor: action === 'reject' ? '#EF4444' : '#7C3AED' });
    if (!confirmed.isConfirmed) return;
    for (const id of selectedIds) {
      if (action === 'approve') {
        await handleAction(id, 'approve_application', { remarks: 'Bulk approved by admin' });
      } else if (action === 'reject') {
        await handleAction(id, 'reject', { remarks: 'Bulk rejected by admin' });
      }
    }
    setSelectedIds([]);
  };

  if (loading) return <ApplicationsTableSkeleton />;

  return (
    <div className="page-bottom-safe bg-slate-50/50">
      <div className="max-w-[1600px] mx-auto px-2 md:px-6 space-y-4 md:space-y-6 pb-6">
        <div className="lg:hidden flex gap-2">
          <Button onClick={handleExportCSV} variant="secondary" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            CSV
          </Button>
          <Button onClick={handleExportPDF} variant="primary" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            PDF
          </Button>
        </div>

        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total', value: analytics.total, color: 'text-slate-900', bg: 'bg-slate-50 border-slate-200' },
              { label: 'Pending', value: analytics.pending, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
              { label: 'Under Review', value: (analytics.status_breakdown?.under_review || 0), color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
              { label: 'Approved', value: analytics.approved, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
              { label: 'Enrolled', value: analytics.enrolled, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
              { label: 'Rejected', value: analytics.rejected, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border rounded-xl p-4`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
                <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search name, email, or enrollment #..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
              <option value="">All Grades</option>
              {GRADE_LEVELS.filter(Boolean).map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
              <option value="">All Types</option>
              {[{ v: 'new', l: 'New' }, { v: 'returning', l: 'Returning' }, { v: 'transferee', l: 'Transferee' }, { v: 'sh_applicant', l: 'SHS' }, { v: 'parent_assisted', l: 'Parent-Assisted' }].map(t =>
                <option key={t.v} value={t.v}>{t.l}</option>
              )}
            </select>
            <select value={schoolYearFilter} onChange={e => setSchoolYearFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
              <option value="">All Years</option>
              {schoolYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {selectedIds.length > 0 && (
            <div className="px-4 py-2 bg-violet-50 border-b border-violet-100 flex items-center gap-3">
              <span className="text-xs font-bold text-violet-800">{selectedIds.length} selected</span>
              <Button onClick={() => bulkAction('approve')} variant="success" size="sm">Approve All</Button>
              <Button onClick={() => bulkAction('reject')} variant="danger" size="sm">Reject All</Button>
              <Button onClick={() => setSelectedIds([])} variant="ghost" size="sm">Clear</Button>
            </div>
          )}

          {/* Mobile card view */}
          <div className="md:hidden divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400 font-bold">No applications found</div>
            ) : filtered.map(app => (
              <button key={app.id} onClick={() => setSelected(app)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50/50 transition-colors active:bg-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{app.first_name} {app.last_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{app.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border flex-shrink-0 ${(STATUS_CONFIG[app.status] || STATUS_CONFIG.pending).color}`}>
                    {(STATUS_CONFIG[app.status] || STATUS_CONFIG.pending).label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px]">
                  <span className="font-bold text-violet-700">{app.enrollment_number || '—'}</span>
                  <span className="text-slate-300">|</span>
                  <span className="font-bold text-slate-600">G{app.grade_level}{app.strand ? ` ${app.strand}` : ''}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-400">{app.enrollment_type?.replace('_', ' ') || '—'}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-3 py-3 w-8"><input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? filtered.map(a => a.id) : [])} checked={selectedIds.length === filtered.length && filtered.length > 0} className="w-4 h-4 text-violet-600 rounded" /></th>
                  <th className="px-3 py-3">Applicant</th>
                  <th className="px-3 py-3">Enrollment #</th>
                  <th className="px-3 py-3">Grade</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 hidden md:table-cell">Submitted</th>
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400 font-bold">No applications found</td></tr>
                ) : filtered.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(app.id)} onChange={() => { if (selectedIds.includes(app.id)) setSelectedIds(prev => prev.filter(x => x !== app.id)); else setSelectedIds(prev => [...prev, app.id]); }} className="w-4 h-4 text-violet-600 rounded" /></td>
                    <td className="px-3 py-3">
                      <button onClick={() => setSelected(app)} className="text-left">
                        <p className="text-sm font-bold text-slate-900">{app.last_name}, {app.first_name}</p>
                        <p className="text-[10px] text-slate-400">{app.email}</p>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-violet-700">{app.enrollment_number || '—'}</td>
                    <td className="px-3 py-3">
                      <span className="text-sm font-bold text-slate-700">G{app.grade_level}</span>
                      {app.strand && <span className="text-[9px] text-slate-400 ml-1">{app.strand}</span>}
                    </td>
                    <td className="px-3 py-3 text-[10px] text-slate-500 font-semibold">{app.enrollment_type?.replace('_', ' ') || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border ${(STATUS_CONFIG[app.status] || STATUS_CONFIG.pending).color}`}>
                        {(STATUS_CONFIG[app.status] || STATUS_CONFIG.pending).label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 hidden md:table-cell">{new Date(app.submitted_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-center relative">
                      <div className="hidden md:flex items-center justify-center gap-1">
                        <Button onClick={() => handleView(app)} variant="ghost" size="sm" title="View">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </Button>
                        {(app.status === 'pending' || app.status === 'under_review') && (
                          <>
                            <Button onClick={() => promptReject(app.id)} variant="ghost" size="sm" title="Reject">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </Button>
                            {app.status === 'under_review' && (
                              <Button onClick={() => promptApproveApplication(app.id)} variant="ghost" size="sm" title="Approve">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              </Button>
                            )}
                          </>
                        )}
                        {(app.status === 'pending' || app.status === 'under_review' || app.status === 'approved') && (
                          <Button onClick={() => assignSection(app.id, app.grade_level)} variant="ghost" size="sm" title="Set Section">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          </Button>
                        )}
                        {app.status === 'approved' && (
                          <Button onClick={() => { setEnrollApp(app); setShowEnrollModal(true); }} variant="ghost" size="sm" title="Enroll">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          </Button>
                        )}
                        {app.enrolled_student && (
                          <Button onClick={() => promptWithdraw(app.id)} variant="ghost" size="sm" title="Unenroll Student">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          </Button>
                        )}
                        {app.enrolled_student && (
                          <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">Enrolled</span>
                        )}
                        {app.status !== 'enrolled' && (
                          <Button onClick={() => promptDelete(app.id, `${app.first_name} ${app.last_name}`)} variant="ghost" size="sm" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </Button>
                        )}
                      </div>
                      <div className="md:hidden">
                        <Button onClick={() => setActiveMenu(activeMenu === app.id ? null : app.id)} variant="ghost" size="sm" className={`${activeMenu === app.id ? 'bg-violet-100 text-violet-600' : 'text-slate-400'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                        </Button>
                        {activeMenu === app.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1 min-w-[130px]">
                            <Button onClick={() => { handleView(app); setActiveMenu(null); }} variant="ghost" size="sm" className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-violet-50 flex items-center gap-2">View</Button>
{(app.status === 'pending' || app.status === 'under_review') && (
                               <>
                                 <Button onClick={() => { promptReject(app.id); setActiveMenu(null); }} variant="ghost" size="sm" className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2">Reject</Button>
                                 {app.status === 'under_review' && (
                                   <Button onClick={() => { promptApproveApplication(app.id); setActiveMenu(null); }} variant="ghost" size="sm" className="w-full text-left px-3 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">Approve</Button>
                                 )}
                               </>
                             )}
                             {app.status === 'enrolled' && (
                               <Button onClick={() => { promptWithdraw(app.id); setActiveMenu(null); }} variant="ghost" size="sm" className="w-full text-left px-3 py-2 text-[10px] font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2">Unenroll</Button>
                             )}
                            <Button onClick={() => { promptRequestDocs(app.id); setActiveMenu(null); }} variant="ghost" size="sm" className="w-full text-left px-3 py-2 text-[10px] font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2">Request Docs</Button>
                            {(app.status === 'pending' || app.status === 'under_review') && (
                              <Button onClick={() => { assignSection(app.id, app.grade_level); setActiveMenu(null); }} variant="ghost" size="sm" className="w-full text-left px-3 py-2 text-[10px] font-bold text-violet-600 hover:bg-violet-50 flex items-center gap-2">Set Section</Button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <ApplicationDrawer
            application={selected}
            onClose={() => setSelected(null)}
            onAction={handleAction}
            classrooms={classrooms}
            onRequestDocs={promptRequestDocs}
            onAssignSection={assignSection}
            onReject={promptReject}
            onApprove={promptApproveApplication}
            onEnroll={(app) => { setEnrollApp(app); setShowEnrollModal(true); }}
            onWithdraw={promptWithdraw}
            onDelete={promptDelete}
            onVerifyDoc={verifyDoc}
          />
        )}
                  {selected.documents && selected.documents.length > 0 ? (
                    <div className="space-y-2">
                      {selected.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-slate-700 truncate">{doc.document_type_display}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              doc.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                              doc.verification_status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                              doc.verification_status === 'missing' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-200 text-slate-600'
                            }`}>{doc.verification_status_display}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg" title="View">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" /></svg>
                            </a>
                            {doc.verification_status !== 'verified' && (
                              <Button onClick={() => verifyDoc(selected.id, doc.id, 'verified')} variant="ghost" size="sm" title="Verify">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              </Button>
                            )}
                            {doc.verification_status !== 'rejected' && (
                              <Button onClick={() => verifyDoc(selected.id, doc.id, 'rejected')} variant="ghost" size="sm" title="Reject">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No documents uploaded</p>
                  )}
                </div>

                {selected.status_history && selected.status_history.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Status Timeline</p>
                    <div className="space-y-0">
                      {selected.status_history.map((h, i) => (
                        <div key={h.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-4 h-4 rounded-full border-2 ${i === 0 ? 'bg-violet-500 border-violet-500' : 'bg-white border-slate-300'}`} />
                            {i < selected.status_history.length - 1 && <div className="w-0.5 h-6 bg-slate-200" />}
                          </div>
                          <div className="pb-3">
                            <p className="text-sm font-semibold text-slate-800">{h.from_status_display || 'Submitted'} &rarr; {h.to_status_display}</p>
                            {h.notes && <p className="text-xs text-slate-500">{h.notes}</p>}
                            <p className="text-[10px] text-slate-400">{new Date(h.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.remarks && (
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Remarks</p>
                    <p className="text-sm text-slate-700 mt-1">{selected.remarks}</p>
                  </div>
                )}

                <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <Button onClick={() => promptRequestDocs(selected.id)} variant="secondary" size="sm">Request Docs</Button>
                    <Button onClick={() => assignSection(selected.id, selected.grade_level)} variant="secondary" size="sm">Set Section</Button>
                    <a href={`/api/enrollment-applications/export-form-pdf/?id=${selected.id}`} target="_blank" rel="noreferrer" className="px-4 py-2 border border-gray-300 bg-white text-gray-700 text-xs font-black uppercase tracking-widest hover:bg-gray-100 rounded-sm">Print Form</a>
                  </div>
                  <div className="flex gap-2">
                    {(selected.status === 'pending' || selected.status === 'under_review') && (
                      <>
                        <Button onClick={() => promptReject(selected.id)} variant="danger" size="sm">Reject</Button>
                        {selected.status === 'under_review' && (
                          <Button onClick={() => promptApproveApplication(selected.id)} variant="success" size="sm">Approve</Button>
                        )}
                      </>
                    )}
                    {selected.status === 'approved' && (
                      <Button onClick={() => { setEnrollApp(selected); setShowEnrollModal(true); }} variant="primary" size="sm">Enroll Student</Button>
                    )}
                    {selected.status === 'enrolled' && (
                      <Button onClick={() => promptWithdraw(selected.id)} variant="warning" size="sm">Unenroll</Button>
                    )}
                    {selected.status !== 'enrolled' && (
                      <Button onClick={() => promptDelete(selected.id, `${selected.first_name} ${selected.last_name}`)} variant="danger" size="sm">Delete</Button>
                    )}
                    <Button onClick={() => setSelected(null)} variant="secondary" size="sm">Close</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEnrollModal && enrollApp && (
          <div className="fixed inset-0 z-[10010] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
              <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-900">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Enroll Student</h2>
                    <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">{enrollApp?.first_name} {enrollApp?.last_name}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setShowEnrollModal(false); setEnrollApp(null); setEnrollClassroom(''); setEnrollParentEmail(''); }}
                  className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">Assign Section</label>
                  <select value={enrollClassroom} onChange={e => setEnrollClassroom(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
                    <option value="">Auto-assign</option>
                    {classrooms.filter(c => String(c.grade_level) === String(enrollApp.grade_level)).map(c => {
                      const count = c.student_count || 0;
                      const cap = c.capacity || 40;
                      return <option key={c.id} value={c.id}>{c.name} ({count}/{cap})</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">Parent Email (optional)</label>
                  <input type="email" value={enrollParentEmail} onChange={e => setEnrollParentEmail(e.target.value)}
                    placeholder="parent@email.com"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400" />
                  <p className="text-[10px] text-gray-400 mt-1">If a parent account exists with this email, it will be linked.</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-700">
                  <strong>Note:</strong> A student account will be created automatically. Save the credentials shown after enrollment.
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
                <button type="button"
                  onClick={() => { setShowEnrollModal(false); setEnrollApp(null); setEnrollClassroom(''); setEnrollParentEmail(''); }}
                  className="px-6 py-2.5 bg-white text-gray-700 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-100 rounded-sm">
                  Cancel
                </button>
                <button type="button" onClick={enrollStudent} disabled={enrolling}
                  className="px-6 py-2.5 bg-[#5e2a84] text-white text-xs font-black uppercase tracking-widest hover:bg-violet-700 rounded-sm">
                  {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AssignSectionModal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setAssignApp(null); }}
        onConfirm={handleConfirmAssign}
        student={assignApp ? {
          first_name: assignApp.first_name,
          last_name: assignApp.last_name,
          profile: { grade_level: assignApp.grade_level, classroom_name: assignApp.assigned_classroom_name }
        } : null}
        classrooms={classrooms}
        title="Assign Section"
        confirmText="Assign"
      />
    </div>
  );
}

function EnrollStudentsTab({ refetch }) {
  const { data, loading } = useParallelFetch({
    classrooms: '/classrooms/',
    students: '/users/?role=student&page_size=500',
  });
  const classrooms = useMemo(() => Array.isArray(data.classrooms) ? data.classrooms : [], [data.classrooms]);
  const students   = useMemo(() => Array.isArray(data.students)   ? data.students   : [], [data.students]);

  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [enrollments,        setEnrollments]       = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [showModal,          setShowModal]          = useState(false);
  const [saving,             setSaving]             = useState(false);
  const [studentSearch,      setStudentSearch]      = useState('');
  const [enrollSearch,       setEnrollSearch]       = useState('');
  const [selectedStudents,   setSelectedStudents]   = useState([]);
  const [showAssignModal,    setShowAssignModal]    = useState(false);
  const [assignEnrollment,   setAssignEnrollment]   = useState(null);

  useEffect(() => {
    if (!selectedClassroom) { setEnrollments([]); return; }
    setLoadingEnrollments(true);
    api.get(`/enrollments/?classroom=${selectedClassroom}`)
      .then(res => setEnrollments(res.data.results || res.data))
      .catch(() => toast.error('Failed to load enrollments'))
      .finally(() => setLoadingEnrollments(false));
  }, [selectedClassroom]);

  const currentClassroom = classrooms.find(c => String(c.id) === String(selectedClassroom));
  const capacity      = currentClassroom?.capacity || 40;
  const enrolledCount = enrollments.length;
  const isFull        = enrolledCount >= capacity;

  const sortedClassrooms = useMemo(() => {
    const order = ['Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
    return [...classrooms].sort((a, b) => {
      const getGrade = n => order.find(g => n.toLowerCase().includes(g.toLowerCase())) || '';
      const iA = order.indexOf(getGrade(a.name));
      const iB = order.indexOf(getGrade(b.name));
      if (iA === -1 && iB === -1) return a.name.localeCompare(b.name);
      if (iA === -1) return 1; if (iB === -1) return -1;
      return iA - iB;
    });
  }, [classrooms]);

  const enrolledIds = useMemo(() => new Set(enrollments.map(e => e.student)), [enrollments]);

  const availableStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return students.filter(s => {
      if (enrolledIds.has(s.id)) return false;
      if (!q) return true;
      const lrn = s.profile?.lrn || s.profile?.registration_number || '';
      return (
        (`${s.first_name || ''} ${s.last_name || ''}`).toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.username || '').toLowerCase().includes(q) ||
        lrn.toLowerCase().includes(q)
      );
    });
  }, [students, enrolledIds, studentSearch]);

  const filteredEnrollments = useMemo(() => {
    const q = enrollSearch.toLowerCase();
    if (!q) return enrollments;
    return enrollments.filter(e =>
      (e.student_name || '').toLowerCase().includes(q) ||
      (e.student_email || '').toLowerCase().includes(q) ||
      (e.student_lrn || '').toLowerCase().includes(q)
    );
  }, [enrollments, enrollSearch]);

  const openModal = () => { setSelectedStudents([]); setStudentSearch(''); setShowModal(true); };
  const toggleStudent = id => setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedStudents(selectedStudents.length === availableStudents.length ? [] : availableStudents.map(s => s.id));

  const handleEnroll = async e => {
    e.preventDefault();
    if (!selectedStudents.length) return toast.error('Select at least one student');
    setSaving(true);
    const t = toast.loading(`Enrolling ${selectedStudents.length} student(s)…`);
    try {
      await api.post(`/classrooms/${parseInt(selectedClassroom)}/bulk_enroll/`, {
        student_ids: selectedStudents.map(Number),
      });
      toast.success(`${selectedStudents.length} student(s) enrolled`, { id: t });
      setShowModal(false); setSelectedStudents([]);
      const res = await api.get(`/enrollments/?classroom=${selectedClassroom}`);
      setEnrollments(res.data.results || res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to enroll', { id: t });
    } finally { setSaving(false); }
  };

  const handleRemove = async enrollment => {
    const { value: formValues } = await Swal.fire({
      title: 'Withdraw Student?',
      html: `
        <p class="text-sm text-slate-600 mb-3">Remove <strong>${enrollment.student_name}</strong> from this section. Select a reason:</p>
        <select id="swal-reason-type" class="swal2-input text-sm" style="max-width:100%;height:40px;margin:0 auto 12px">
          <option value="transferred">Transferred Out</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="dropped">Dropped</option>
          <option value="other">Other</option>
        </select>
        <textarea id="swal-reason" class="swal2-textarea text-sm" placeholder="Enter reason (required)" style="min-height:80px"></textarea>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Withdraw Student',
      cancelButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl' },
      preConfirm: () => {
        const reason = document.getElementById('swal-reason')?.value?.trim();
        if (!reason) { Swal.showValidationMessage('A reason is required'); return false; }
        return {
          reason_type: document.getElementById('swal-reason-type')?.value || 'other',
          reason,
        };
      },
    });
    if (!formValues) return;
    try {
      await api.post(`/enrollments/${enrollment.enrollment_id || enrollment.id}/withdraw_student/`, {
        reason_type: formValues.reason_type,
        reason: formValues.reason,
      });
      toast.success('Student withdrawn');
      setEnrollments(prev => prev.filter(e => e.id !== enrollment.id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to withdraw student');
    }
  };

  const openAssignSection = (enrollment) => {
    setAssignEnrollment(enrollment);
    setShowAssignModal(true);
  };

  const handleConfirmReassign = async (classroomId) => {
    if (!assignEnrollment) return;
    const t = toast.loading('Moving student to new section…');
    try {
      await api.post('/enrollments/assign-classroom/', {
        student: assignEnrollment.student,
        classroom: classroomId,
      });
      toast.success(`${assignEnrollment.student_name} moved successfully`, { id: t });
      setShowAssignModal(false);
      setAssignEnrollment(null);
      const res = await api.get(`/enrollments/?classroom=${selectedClassroom}`);
      setEnrollments(res.data.results || res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to move student', { id: t });
    }
  };

  if (loading) return <div className="space-y-4"><ClassroomGridSkeleton /></div>;

  // View 1: Classroom grid (default)
  if (!selectedClassroom) {
    return (
      <div className="space-y-4">
        {/* Classroom selector — card grid */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Select Section</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {sortedClassrooms.map(c => {
              const cnt = c.student_count ?? 0;
              const cap = c.capacity || 40;
              const isFull = cnt >= cap;
              const gradeMatch = c.name.match(/grade\s*(\d+)/i);
              const gradeNum = gradeMatch ? parseInt(gradeMatch[1]) : 0;
              const gradeColors = {
                7: 'from-green-500 to-green-600',
                8: 'from-yellow-500 to-yellow-600',
                9: 'from-red-500 to-red-600',
                10: 'from-blue-500 to-blue-600',
                11: 'from-pink-500 to-pink-600',
                12: 'from-gray-900 to-black',
              };
              const gradient = gradeColors[gradeNum] || 'from-slate-500 to-slate-600';
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedClassroom(c.id); setEnrollSearch(''); }}
                  className={`relative text-left rounded-xl border-2 transition-all duration-200 p-3 md:p-4
                    ${isFull
                      ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer'
                    }`}
                  disabled={isFull}
                >
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-2 ${isFull ? 'opacity-50' : ''}`}>
                    <span className="text-white text-[10px] md:text-xs font-black">{gradeNum || '?'}</span>
                  </div>
                  <p className={`text-[10px] md:text-sm font-black uppercase tracking-tight truncate leading-tight ${isFull ? 'text-slate-400' : 'text-slate-800'}`}>
                    {c.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[8px] md:text-[11px] font-semibold ${isFull ? 'text-rose-600' : 'text-slate-400'}`}>
                      {cnt}/{cap}
                    </span>
                    {isFull && (
                      <span className="text-[7px] md:text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 py-px rounded uppercase">Full</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // View 2: Student list for selected classroom
  return (
    <div className="space-y-4">
      {/* Back button + header */}
      <div className="flex items-center gap-3 px-2">
        <button onClick={() => { setSelectedClassroom(''); setEnrollSearch(''); }}
          className="flex items-center gap-2 text-violet-600 hover:text-violet-800 font-bold text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sections
        </button>
        <div className="ml-auto">
          <p className="text-sm font-black text-slate-900">{currentClassroom?.name}</p>
          <p className="text-xs text-slate-400">
            {enrolledCount}/{capacity} enrolled {isFull ? ' · Full' : ''}
          </p>
        </div>
      </div>

      {/* Add Students Button */}
      {!isFull && (
        <div className="px-2 pb-2">
          <button onClick={openModal}
            className="flex items-center gap-2 w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Students
          </button>
        </div>
      )}

      {/* Enrolled Students List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
          <p className="text-sm font-black text-slate-700 uppercase tracking-wide">Enrolled Students</p>
          <div className="ml-auto relative w-56">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)}
              placeholder="Search enrolled…"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
        </div>
        {loadingEnrollments ? (
          <EnrolledListSkeleton rows={3} />
        ) : filteredEnrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-10 h-10 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-semibold text-slate-400">{enrollSearch ? 'No students match your search' : 'No students enrolled yet'}</p>
            {!enrollSearch && !isFull && <button onClick={openModal} className="mt-3 text-xs font-bold text-violet-600 hover:underline">Add students →</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 hidden sm:table-cell">LRN</th>
                  <th className="px-4 py-3 hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnrollments.map((e, idx) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-400 w-10">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-violet-600">
                            {(e.student_name || '?').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{e.student_name || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500 font-mono">{e.student_lrn || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{e.student_email || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => openAssignSection(e)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 hover:bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg transition-colors">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          Change Section
                        </button>
                        <button onClick={() => handleRemove(e)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Withdraw
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Students Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Add Students</h2>
                  <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">
                    {currentClassroom?.name} · {enrolledCount}/{capacity} enrolled
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)}
                className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 pt-4 pb-2 flex-shrink-0 space-y-2 border-b border-slate-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search by name, LRN, or email…" autoFocus
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox"
                    checked={availableStudents.length > 0 && selectedStudents.length === availableStudents.length}
                    onChange={toggleAll} className="w-4 h-4 rounded text-violet-600" />
                  <span className="text-xs font-bold text-slate-600">Select all ({availableStudents.length})</span>
                </label>
                {selectedStudents.length > 0 && (
                  <span className="text-xs font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                    {selectedStudents.length} selected
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {availableStudents.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm font-semibold text-slate-400">
                  {studentSearch ? 'No students match your search' : 'All students are already enrolled'}
                </div>
              ) : availableStudents.map(s => {
                const checked = selectedStudents.includes(s.id);
                const lrn = s.profile?.lrn || s.profile?.registration_number || '';
                return (
                  <label key={s.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${checked ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleStudent(s.id)} className="w-4 h-4 rounded text-violet-600 flex-shrink-0" />
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black text-violet-600">
                        {`${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{s.last_name}, {s.first_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{lrn ? `LRN: ${lrn}` : (s.email || s.username)}</p>
                    </div>
                    {s.profile?.grade_level && (
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex-shrink-0">
                        {s.profile.grade_level}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
              <button onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-white text-gray-700 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-100 rounded-sm">
                Cancel
              </button>
              <button onClick={handleEnroll} disabled={saving || !selectedStudents.length}
                className="px-5 py-2.5 bg-[#5e2a84] text-white text-xs font-black uppercase tracking-widest hover:bg-violet-700 rounded-sm disabled:opacity-50">
                {saving ? 'Enrolling…' : `Enroll ${selectedStudents.length || ''} Student${selectedStudents.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <AssignSectionModal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setAssignEnrollment(null); }}
        onConfirm={handleConfirmReassign}
        student={assignEnrollment ? {
          first_name: (assignEnrollment.student_name || '').split(' ')[0],
          last_name: (assignEnrollment.student_name || '').split(' ').slice(1).join(' '),
          profile: { grade_level: currentClassroom?.grade_level || '', classroom_name: currentClassroom?.name || '' }
        } : null}
        classrooms={classrooms}
        title="Change Section"
        confirmText="Move Student"
      />
    </div>
  );
}

export default function EnrollmentHub() {
  const [activeTab, setActiveTab] = useState('applications');

  const tabs = [
    { id: 'applications', label: 'Applications', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'enroll-students', label: 'Enroll Students', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
  ];

  return (
    <div className="page-bottom-safe bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#5e2a84] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Enrollment Hub</h1>
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Applications & student section assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab.id ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        {activeTab === 'applications' && <ApplicationsTab refetch={() => {}} />}
        {activeTab === 'enroll-students' && <EnrollStudentsTab refetch={() => {}} />}
      </div>
    </div>
  );
}
