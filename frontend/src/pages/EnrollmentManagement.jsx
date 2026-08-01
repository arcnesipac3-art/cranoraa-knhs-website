import { useState, useMemo } from 'react';
import api from '../utils/api';
import Swal from 'sweetalert2';
import { useParallelFetch } from '../hooks/useFetch';
import { LoadingSpinner } from '../components/ui';
import { ApplicationsTableSkeleton } from '../components/enrollment/Skeletons';
import { AssignSectionModal } from '../components/modals/AssignSectionModal';

const STATUS_CONFIG = {
  pending: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pending' },
  under_review: { color: 'bg-violet-100 text-violet-800 border-violet-200', label: 'Under Review' },
  pending_requirements: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Pending Req' },
  approved: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Approved' },
  rejected: { color: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Rejected' },
  cancelled: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Cancelled' },
  enrolled: { color: 'bg-violet-100 text-violet-800 border-violet-200', label: 'Enrolled' },
  withdrawn: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Withdrawn' },
};

const GRADE_LEVELS = ['','7','8','9','10','11','12'];

const EnrollmentManagement = () => {
  const { data, loading, refetch } = useParallelFetch({
    applications: '/enrollment-applications/',
    analytics: '/enrollment-applications/analytics/',
    classrooms: '/classrooms/',
  });
  const applications = data.applications?.results || data.applications || [];
  const analytics = data.analytics || null;
  const classrooms = data.classrooms?.results || data.classrooms || [];

  // Dynamic school years from applications
  const schoolYears = useMemo(() => {
    const years = new Set(applications.map(a => a.school_year).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [applications]);
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
  const [viewMode, setViewMode] = useState('list');
  const [checklist, setChecklist] = useState(null);

  const handleAction = async (id, action, opts = {}) => {
    try {
      // delete_application uses DELETE method; all others use POST
      const res = action === 'delete_application'
        ? await api.delete(`/enrollment-applications/${id}/delete_application/`)
        : await api.post(`/enrollment-applications/${id}/${action}/`, opts);
      Swal.fire({ icon: 'success', title: 'Done', text: res.data?.status || res.data?.message || 'Action completed.' });
      refetch();
      if (selected?.id === id && action !== 'enroll_student') setSelected(null);
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
    setChecklist(app.checklist || null);
    if (app.status === 'pending') {
      try {
        await api.post(`/enrollment-applications/${app.id}/start-review/`, { remarks: '' });
        setSelected({ ...app, status: 'under_review' });
        refetch();
      } catch { /* ignore */ }
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
    } catch {
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
    } catch {
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
      // Update local state without refreshing
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

  // Authenticated file download helper
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

  const filtered = applications.filter(app => {
    if (filter !== 'all' && app.status !== filter) return false;
    if (gradeFilter && app.grade_level !== gradeFilter) return false;
    if (typeFilter && app.enrollment_type !== typeFilter) return false;
    if (schoolYearFilter && app.school_year !== schoolYearFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!app.first_name.toLowerCase().includes(q) && !app.last_name.toLowerCase().includes(q) && !app.email.toLowerCase().includes(q) && !(app.enrollment_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const bulkAction = async (action) => {
    if (!selectedIds.length) { Swal.fire({ icon: 'warning', text: 'Select applications first.' }); return; }
    
    // Get selected application details for confirmation
    const selectedApps = applications.filter(app => selectedIds.includes(app.id));
    const appList = selectedApps.slice(0, 5).map(a => `• ${a.first_name} ${a.last_name} (${a.enrollment_number || 'N/A'})`).join('<br>');
    const remaining = selectedIds.length > 5 ? `<br><em>...and ${selectedIds.length - 5} more</em>` : '';
    
    const confirmed = await Swal.fire({ 
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} ${selectedIds.length} application(s)?`,
      html: `<div class="text-left text-sm mt-2">${appList}${remaining}</div>`,
      icon: 'question',
      showCancelButton: true, 
      confirmButtonText: 'Confirm', 
      confirmButtonColor: action === 'reject' ? '#EF4444' : '#7C3AED' 
    });
    if (!confirmed.isConfirmed) return;
    try {
      if (action === 'approve') {
        for (const id of selectedIds) {
          await api.post(`/enrollment-applications/${id}/approve_application/`, { remarks: 'Bulk approved by admin' });
        }
      } else if (action === 'reject') {
        for (const id of selectedIds) {
          await handleAction(id, 'reject', { remarks: 'Bulk rejected by admin' });
        }
      } else if (action === 'enroll') {
        for (const id of selectedIds) {
          await api.post(`/enrollment-applications/${id}/enroll_student/`);
        }
      }
      Swal.fire({ icon: 'success', title: 'Done', text: `${action} completed for ${selectedIds.length} application(s)`, timer: 2000, showConfirmButton: false });
      refetch();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Bulk action failed' });
    }
    setSelectedIds([]);
  };

  const URL_DOC_FIELDS = [
    { field: 'birth_certificate', type: 'PSA Birth Certificate' },
    { field: 'report_card', type: 'Report Card' },
    { field: 'form_138', type: 'Form 138 / Grade 6 Certificate' },
    { field: 'certificate_of_completion', type: 'Certificate of Completion' },
    { field: 'good_moral_certificate', type: 'Good Moral Certificate' },
    { field: 'id_picture', type: 'ID Picture' },
    { field: 'last_school_attended_cert', type: 'Last School Attended Certificate' },
  ];

  const getAppDocs = (app) => {
    if (app?.documents && app.documents.length > 0) return app.documents;
    return URL_DOC_FIELDS
      .filter(({ field }) => app?.[field])
      .map(({ field, type }) => ({
        id: `url-${field}`,
        document_type_display: type,
        file_url: app[field],
        verification_status: 'submitted',
        verification_status_display: 'Submitted',
        _fromUrlField: true,
      }));
  };

  if (loading) return <ApplicationsTableSkeleton />;

  return (
    <div className="page-bottom-safe bg-slate-50/50">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Admissions Management</h1>
        <p className="text-xs text-slate-500 mt-1">SY {new Date().getFullYear()}-{new Date().getFullYear() + 1} Enrollment Applications</p>
      </div>
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <button onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          CSV
        </button>
        <button onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-all shadow-md">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          PDF Report
        </button>
      </div>

      <div className="max-w-[1600px] mx-auto px-2 md:px-6 space-y-4 md:space-y-6 pb-6">
      {/* Mobile Export Buttons */}
      <div className="lg:hidden flex gap-2">
        <button onClick={handleExportCSV}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          CSV
        </button>
        <button onClick={handleExportPDF}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          PDF
        </button>
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
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('list')} className={`px-3 py-2 text-xs font-bold ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-2 text-xs font-bold ${viewMode === 'kanban' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="px-4 py-2 bg-violet-50 border-b border-violet-100 flex items-center gap-3">
            <span className="text-xs font-bold text-violet-800">{selectedIds.length} selected</span>
            <button onClick={() => bulkAction('approve')} className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700">Approve All</button>
            <button onClick={() => bulkAction('reject')} className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700">Reject All</button>
            <button onClick={() => bulkAction('enroll')} className="px-3 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700">Enroll All</button>
            <button onClick={() => setSelectedIds([])} className="text-[10px] font-bold text-slate-500 hover:text-slate-700">Clear</button>
          </div>
        )}

        <div className="overflow-x-auto">
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
                  <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(app.id)} onChange={() => toggleSelect(app.id)} className="w-4 h-4 text-violet-600 rounded" /></td>
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
                      <button onClick={() => handleView(app)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all" title="View">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      {(app.status === 'pending' || app.status === 'under_review') && (
                        <>
                          <button onClick={() => promptReject(app.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Reject">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                          {app.status === 'under_review' && (
                            <button onClick={() => promptApproveApplication(app.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Approve">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </button>
                          )}
                        </>
                      )}
                      {(app.status === 'pending' || app.status === 'under_review' || app.status === 'approved') && (
                        <button onClick={() => assignSection(app.id, app.grade_level)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg" title="Set Section">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </button>
                      )}
                      {app.status === 'approved' && (
                        <button onClick={() => { setEnrollApp(app); setShowEnrollModal(true); }} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg" title="Enroll">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        </button>
                      )}
                      {app.enrolled_student && (
                        <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">Enrolled</span>
                      )}
                      {app.status !== 'enrolled' && (
                        <button onClick={() => promptDelete(app.id, `${app.first_name} ${app.last_name}`)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                    <div className="md:hidden">
                      <button onClick={() => setActiveMenu(activeMenu === app.id ? null : app.id)} className={`p-1 rounded-md ${activeMenu === app.id ? 'bg-violet-100 text-violet-600' : 'text-slate-400'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                      </button>
                      {activeMenu === app.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1 min-w-[130px]">
                          <button onClick={() => { handleView(app); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-violet-50 flex items-center gap-2">View</button>
                          {(app.status === 'pending' || app.status === 'under_review') && (
                            <>
                              <button onClick={() => { promptReject(app.id); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2">Reject</button>
                              {app.status === 'under_review' && (
                                <button onClick={() => { promptApproveApplication(app.id); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">Approve</button>
                              )}
                            </>
                          )}
                          <button onClick={() => { promptRequestDocs(app.id); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2">Request Docs</button>
                          {(app.status === 'pending' || app.status === 'under_review') && (
                            <button onClick={() => { assignSection(app.id, app.grade_level); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-violet-600 hover:bg-violet-50 flex items-center gap-2">Set Section</button>
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

      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          {['pending', 'under_review', 'approved', 'enrolled'].map(status => {
            const statusApps = filtered.filter(a => a.status === status);
            return (
              <div key={status} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase">{STATUS_CONFIG[status]?.label || status}</h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full">{statusApps.length}</span>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {statusApps.map(app => (
                    <div key={app.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer" onClick={() => handleView(app)}>
                      <p className="text-sm font-bold text-slate-900">{app.last_name}, {app.first_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">G{app.grade_level} • {app.enrollment_type?.replace('_', ' ')}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${(STATUS_CONFIG[app.status] || STATUS_CONFIG.pending).color}`}>
                          {app.enrollment_number || '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {statusApps.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No applications</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white w-full max-w-3xl border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">
                    {selected.full_name || `${selected.first_name} ${selected.last_name}`}
                  </h2>
                  <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">
                    {selected.enrollment_number} — Enrollment Application
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)}
                className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border ${(STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending).color}`}>
                  {(STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending).label}
                </span>
                {selected.assigned_classroom_name && <span className="text-xs font-bold text-violet-600">Section: {selected.assigned_classroom_name}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[9px] font-bold text-slate-400 uppercase">Type</p><p className="font-bold text-slate-800">{selected.enrollment_type?.replace('_', ' ') || 'New'}</p></div>
                <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[9px] font-bold text-slate-400 uppercase">Grade</p><p className="font-bold text-slate-800">Grade {selected.grade_level}{selected.strand ? ` - ${selected.strand}` : ''}</p></div>
                <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[9px] font-bold text-slate-400 uppercase">School Year</p><p className="font-bold text-slate-800">{selected.school_year || 'N/A'}</p></div>
                <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[9px] font-bold text-slate-400 uppercase">Sex</p><p className="font-bold text-slate-800">{selected.sex}</p></div>
                <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[9px] font-bold text-slate-400 uppercase">DOB</p><p className="font-bold text-slate-800">{selected.date_of_birth} ({selected.age || '?'} yrs)</p></div>
                <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[9px] font-bold text-slate-400 uppercase">LRN</p><p className="font-bold text-slate-800">{selected.lrn || (selected.lrn_request_reason ? `Requested: ${selected.lrn_request_reason.replace(/_/g, ' ')}` : 'N/A')}</p></div>
                <div className="col-span-2 bg-slate-50 p-3 rounded-xl"><p className="text-[9px] font-bold text-slate-400 uppercase">Address</p><p className="font-bold text-slate-800">{selected.street_address}, {selected.barangay}, {selected.city_municipality}, {selected.province}</p></div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Parents / Guardian</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-emerald-50 p-3 rounded-xl"><p className="text-[9px] font-bold text-emerald-600 uppercase">Father</p><p className="font-bold text-slate-800">{selected.father_name || 'N/A'}</p><p className="text-xs text-slate-500">{selected.father_contact || ''}</p>{selected.father_email && <p className="text-[10px] text-slate-400">{selected.father_email}</p>}</div>
                  <div className="bg-rose-50 p-3 rounded-xl"><p className="text-[9px] font-bold text-rose-600 uppercase">Mother</p><p className="font-bold text-slate-800">{selected.mother_name || 'N/A'}</p><p className="text-xs text-slate-500">{selected.mother_contact || ''}</p>{selected.mother_email && <p className="text-[10px] text-slate-400">{selected.mother_email}</p>}</div>
                  {selected.guardian_name && <div className="bg-amber-50 p-3 rounded-xl col-span-2"><p className="text-[9px] font-bold text-amber-600 uppercase">Guardian</p><p className="font-bold text-slate-800">{selected.guardian_name} ({selected.guardian_relationship})</p><p className="text-xs text-slate-500">{selected.guardian_contact || ''}</p></div>}
                  {selected.linked_parent_email && <div className="bg-violet-50 p-3 rounded-xl col-span-2 border border-violet-200"><p className="text-[9px] font-bold text-violet-600 uppercase">Linked Parent Account</p><p className="text-xs text-violet-700 font-semibold">{selected.linked_parent_email}</p></div>}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Documents</p>
                {(() => {
                  const docs = getAppDocs(selected);
                  return (
                    <>
                      {selected.status === 'under_review' && docs.length > 0 &&
                        !docs.every(d => d.verification_status === 'verified') && (
                        <p className="text-[10px] text-amber-600 font-bold mb-2">
                          Verify all documents to enable the Approve button.
                        </p>
                      )}
                      {docs.length > 0 ? (
                        <div className="space-y-2">
                          {docs.map(doc => (
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
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </a>
                                {!doc._fromUrlField && doc.verification_status !== 'verified' && (
                                  <button onClick={() => verifyDoc(selected.id, doc.id, 'verified')} className="p-1.5 text-emerald-400 hover:text-emerald-600 rounded-lg" title="Verify">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                  </button>
                                )}
                                {!doc._fromUrlField && doc.verification_status !== 'rejected' && (
                                  <button onClick={() => verifyDoc(selected.id, doc.id, 'rejected')} className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg" title="Reject">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No documents uploaded</p>
                      )}
                    </>
                  );
                })()}
              </div>

              {checklist && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Enrollment Checklist</p>
                  <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                    {[
                      { key: 'documents_complete', label: 'All Documents Verified' },
                      { key: 'lrn_verified', label: 'LRN Verified' },
                      { key: 'parent_contacted', label: 'Parent Contacted' },
                      { key: 'classroom_assigned', label: 'Classroom Assigned' },
                      { key: 'profile_complete', label: 'Profile Complete' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded flex items-center justify-center ${checklist[item.key] ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}>
                          {checklist[item.key] && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </span>
                        <span className={`text-xs font-semibold ${checklist[item.key] ? 'text-emerald-700' : 'text-slate-500'}`}>{item.label}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                      <span className={`text-xs font-bold ${checklist.is_complete ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {checklist.is_complete ? 'Ready for Enrollment' : 'Incomplete — Action Required'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
            </div>
            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex gap-2">
                <button onClick={() => promptRequestDocs(selected.id)} className="px-4 py-2 border border-amber-300 bg-amber-50 text-amber-700 text-xs font-black uppercase tracking-widest hover:bg-amber-100 rounded-sm">Request Docs</button>
                <button onClick={() => assignSection(selected.id, selected.grade_level)} className="px-4 py-2 border border-violet-300 bg-violet-50 text-violet-700 text-xs font-black uppercase tracking-widest hover:bg-violet-100 rounded-sm">Set Section</button>
                <a href={`/api/enrollment-applications/export-form-pdf/?id=${selected.id}`} target="_blank" rel="noreferrer"
                  className="px-4 py-2 border border-gray-300 bg-white text-gray-700 text-xs font-black uppercase tracking-widest hover:bg-gray-100 rounded-sm">Print Form</a>
              </div>
              <div className="flex gap-2">
                {(selected.status === 'pending' || selected.status === 'under_review') && (
                  <>
                    <button onClick={() => { promptReject(selected.id); }} className="px-4 py-2 border border-red-300 bg-white text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-50 rounded-sm">Reject</button>
                    {selected.status === 'under_review' && (() => {
                      const selDocs = getAppDocs(selected);
                      const allDocsVerified = selDocs.length === 0 ||
                        selDocs.every(d => d.verification_status === 'verified');
                      return (
                        <button
                          onClick={() => { if (allDocsVerified) promptApproveApplication(selected.id); }}
                          disabled={!allDocsVerified}
                          className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-sm ${
                            allDocsVerified
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                          title={allDocsVerified ? 'Approve' : 'Verify all documents first'}
                        >
                          Approve
                        </button>
                      );
                    })()}
                  </>
                )}
                {selected.status === 'approved' && (
                  <button onClick={() => { setEnrollApp(selected); setShowEnrollModal(true); }} className="px-4 py-2 bg-[#5e2a84] text-white text-xs font-black uppercase tracking-widest hover:bg-violet-700 rounded-sm">Enroll Student</button>
                )}
                {selected.status !== 'enrolled' && (
                  <button onClick={() => promptDelete(selected.id, selected.full_name || `${selected.first_name} ${selected.last_name}`)} className="px-4 py-2 border border-red-300 bg-white text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-50 rounded-sm">Delete</button>
                )}
                <button onClick={() => setSelected(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-black uppercase tracking-widest hover:bg-gray-100 rounded-sm">Close</button>
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
};

export default EnrollmentManagement;

