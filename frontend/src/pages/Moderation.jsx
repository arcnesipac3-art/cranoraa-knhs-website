import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useFetch } from '../hooks/useFetch';
import { Skeleton, EmptyState } from '../components/ui';

const Moderation = () => {
  const [filter, setFilter] = useState('pending');
  const { data, loading, refetch, setData: setReports } = useFetch('/chat/reports/', {
    params: { status: filter === 'all' ? undefined : filter },
    deps: [filter],
    transform: (d) => Array.isArray(d?.results) ? d.results : (Array.isArray(d) ? d : []),
  });
  const reports = data || [];
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { setSelectedIds([]); }, [filter]);

  const handleAction = async (reportId, actionType, label) => {
    const isDestructive = actionType === 'delete-message' || actionType === 'suspend-user' || actionType === 'delete';
    
    if (actionType === 'delete') {
      const result = await Swal.fire({
        title: 'Delete Report?',
        text: 'This will permanently remove the report record.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete',
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'rounded-[2rem]' }
      });
      if (!result.isConfirmed) return;
      
      try {
        setProcessing(true);
        await api.delete(`/chat/reports/${reportId}/`);
        toast.success('Report deleted');
        refetch();
      } catch {
        toast.error('Failed to delete report');
      } finally {
        setProcessing(false);
      }
      return;
    }

    const { value: note } = await Swal.fire({
      title: label,
      input: 'textarea',
      inputLabel: 'Moderator Note (Optional)',
      inputPlaceholder: 'Reason for this action...',
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      confirmButtonColor: isDestructive ? '#ef4444' : '#6366f1',
      customClass: {
        popup: 'rounded-[2rem]',
        input: 'text-sm'
      }
    });

    if (note !== undefined) {
      try {
        setProcessing(true);
        await api.post(`/chat/reports/${reportId}/${actionType}/`, { note });
        toast.success('Action applied successfully');
        refetch();
      } catch (error) {
        toast.error('Failed to apply action');
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} reports?`,
      text: "This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete all',
      confirmButtonColor: '#ef4444',
      customClass: { popup: 'rounded-[2rem]' }
    });

    if (result.isConfirmed) {
      try {
        setProcessing(true);
        await api.post('/chat/reports/bulk-delete/', { ids: selectedIds });
        toast.success(`${selectedIds.length} reports deleted`);
        setSelectedIds([]);
        refetch();
      } catch {
        toast.error('Failed to delete reports');
      } finally {
        setProcessing(false);
      }
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reports.length) setSelectedIds([]);
    else setSelectedIds(reports.map(r => r.id));
  };

  const handleMute = async (reportId) => {
    const { value: formValues } = await Swal.fire({
      title: 'Mute User',
      html:
        '<div class="flex flex-col gap-4 p-2">' +
        '<div class="text-left"><label class="text-[10px] font-black uppercase text-slate-400">Duration (Hours)</label>' +
        '<input id="mute-hours" class="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value="24" type="number"></div>' +
        '<div class="text-left"><label class="text-[10px] font-black uppercase text-slate-400">Moderator Note</label>' +
        '<textarea id="mute-note" class="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px]" placeholder="Reason for muting..."></textarea></div>' +
        '</div>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Mute User',
      confirmButtonColor: '#f59e0b',
      customClass: {
        popup: 'rounded-[2rem]',
      },
      preConfirm: () => {
        return {
          hours: document.getElementById('mute-hours').value,
          note: document.getElementById('mute-note').value
        }
      }
    });

    if (formValues) {
      try {
        await api.post(`/chat/reports/${reportId}/mute-user/`, formValues);
        toast.success('User muted successfully');
        refetch();
      } catch (error) {
        toast.error('Failed to mute user');
      }
    }
  };

  const handleUnmute = async (reportId) => {
    const result = await Swal.fire({
      title: 'Unmute User?',
      text: 'This will restore the user\'s messaging privileges immediately.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, unmute',
      confirmButtonColor: '#10b981',
      customClass: { popup: 'rounded-[2rem]' }
    });
    if (!result.isConfirmed) return;
    try {
      await api.post(`/chat/reports/${reportId}/unmute-user/`);
      toast.success('User unmuted');
        refetch();
    } catch {
      toast.error('Failed to unmute user');
    }
  };

  const handleSuspend = async (reportId) => {
    const { value: note } = await Swal.fire({
      title: 'Suspend User',
      input: 'textarea',
      inputLabel: 'Moderator Note (Optional)',
      inputPlaceholder: 'Reason for suspension...',
      showCancelButton: true,
      confirmButtonText: 'Suspend',
      confirmButtonColor: '#ef4444',
      customClass: { popup: 'rounded-[2rem]', input: 'text-sm' }
    });
    if (note !== undefined) {
      try {
        await api.post(`/chat/reports/${reportId}/suspend-user/`, { note });
        toast.success('User suspended');
        refetch();
      } catch {
        toast.error('Failed to suspend user');
      }
    }
  };

  const handleUnsuspend = async (reportId) => {
    const result = await Swal.fire({
      title: 'Unsuspend User?',
      text: 'This will restore the user\'s account access.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, unsuspend',
      confirmButtonColor: '#10b981',
      customClass: { popup: 'rounded-[2rem]' }
    });
    if (!result.isConfirmed) return;
    try {
      await api.post(`/chat/reports/${reportId}/unsuspend-user/`);
      toast.success('User unsuspended');
        refetch();
    } catch {
      toast.error('Failed to unsuspend user');
    }
  };

  return (
    <div className="page-bottom-safe bg-slate-50/50">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Content Moderation</h1>
        <p className="text-xs text-slate-500 mt-1">Message Reports & Community Standards</p>
      </div>
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <button
            onClick={handleBulkDelete}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete {selectedIds.length}
          </button>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-2 md:px-6 space-y-4 md:space-y-6 pb-6">
      {/* Mobile Bulk Delete */}
      {selectedIds.length > 0 && (
        <div className="lg:hidden">
          <button
            onClick={handleBulkDelete}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete {selectedIds.length} Reports
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex justify-center">
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {['pending', 'resolved', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Mobile View: Compact Card List */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="px-4 py-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-slate-100">
                  <Skeleton.Avatar size="sm" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-28 rounded" />
                    <Skeleton className="h-3 w-48 rounded" />
                    <Skeleton className="h-2.5 w-20 rounded" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
              No reports found
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className={`p-3 space-y-2 transition-colors ${selectedIds.includes(report.id) ? 'bg-violet-50/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(report.id)}
                      onChange={() => toggleSelect(report.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-[10px] font-black text-slate-700 truncate max-w-[100px]">{report.reporter_name}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">reported</span>
                    <span className="text-[10px] font-black text-violet-600 truncate max-w-[80px]">@{report.message_sender}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${
                    report.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                    report.status === 'dismissed' ? 'bg-slate-100 text-slate-500' :
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {report.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed italic">
                    "{report.message_content}"
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-slate-500 italic truncate" title={report.reason}>
                      Reason: {report.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {report.status === 'pending' ? (
                      <>
                        <button onClick={() => handleAction(report.id, 'resolve', 'Resolve')} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg active:scale-95" title="Resolve"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></button>
                        <button onClick={() => handleAction(report.id, 'delete-message', 'Delete Message')} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg active:scale-95" title="Delete Message"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        {report.sender_is_muted ? (
                          <button onClick={() => handleUnmute(report.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg active:scale-95" title="Unmute"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
                        ) : (
                          <button onClick={() => handleMute(report.id)} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg active:scale-95" title="Mute"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg></button>
                        )}
                        {report.sender_is_suspended ? (
                          <button onClick={() => handleUnsuspend(report.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg active:scale-95" title="Unsuspend"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></button>
                        ) : (
                          <button onClick={() => handleSuspend(report.id)} className="p-1.5 bg-rose-100 text-rose-700 rounded-lg active:scale-95" title="Suspend"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></button>
                        )}
                        <button onClick={() => handleAction(report.id, 'dismiss', 'Dismiss')} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg active:scale-95" title="Dismiss"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleAction(report.id, 'delete', 'Delete Record')} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete Report Record"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Done by {report.resolved_by_name?.split(' ')[0] || 'Admin'}</span>
                        {report.sender_is_muted && (
                          <button onClick={() => handleUnmute(report.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg active:scale-95 text-[8px] font-black uppercase" title="Unmute">Unmute</button>
                        )}
                        {report.sender_is_suspended && (
                          <button onClick={() => handleUnsuspend(report.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg active:scale-95 text-[8px] font-black uppercase" title="Unsuspend">Unsuspend</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={reports.length > 0 && selectedIds.length === reports.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporter</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Content</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sender</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4">
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-3">
                          <Skeleton.Avatar size="sm" />
                          <Skeleton className="h-3.5 w-32 rounded flex-1" />
                          <Skeleton className="h-3 w-20 rounded" />
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-6 w-20 rounded-lg" />
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                    No reports found
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(report.id) ? 'bg-violet-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(report.id)}
                        onChange={() => toggleSelect(report.id)}
                        className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-700 block truncate max-w-[120px]" title={report.reporter_name}>{report.reporter_name}</span>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="text-xs text-slate-600 line-clamp-3 break-words whitespace-pre-wrap" title={report.message_content}>
                        {report.message_content}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 block truncate" title={`@${report.message_sender}`}>@{report.message_sender}</span>
                        {report.sender_is_muted && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 w-fit">
                            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                            Muted
                          </span>
                        )}
                        {report.sender_is_suspended && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 w-fit">
                            <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                            Suspended
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        report.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                        report.status === 'dismissed' ? 'bg-slate-100 text-slate-500' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {report.status}
                      </span>
                      {report.moderator_note && (
                        <p className="text-[9px] text-slate-400 mt-1 italic line-clamp-1 max-w-[100px]" title={report.moderator_note}>
                          Note: {report.moderator_note}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {report.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {/* Resolve */}
                          <button
                            onClick={() => handleAction(report.id, 'resolve', 'Resolve Report')}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Mark as Resolved"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          {/* Delete Message */}
                          <button
                            onClick={() => handleAction(report.id, 'delete-message', 'Delete Message')}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Message & Resolve"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          {/* Mute / Unmute toggle */}
                          {report.sender_is_muted ? (
                            <button
                              onClick={() => handleUnmute(report.id)}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Unmute User"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMute(report.id)}
                              className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Mute User"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                              </svg>
                            </button>
                          )}
                          {/* Suspend / Unsuspend toggle */}
                          {report.sender_is_suspended ? (
                            <button
                              onClick={() => handleUnsuspend(report.id)}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Unsuspend User"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspend(report.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Suspend User"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                          {/* Dismiss */}
                          <button
                            onClick={() => handleAction(report.id, 'dismiss', 'Dismiss Report')}
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Dismiss (No Action)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Resolved by</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-black text-slate-600 truncate max-w-[80px]" title={report.resolved_by_name}>
                                {report.resolved_by_name || 'Admin'}
                              </span>
                              <button
                                onClick={() => handleAction(report.id, 'delete', 'Delete Record')}
                                className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                title="Delete Report Record"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                          {/* Allow unmute/unsuspend even on resolved reports */}
                          <div className="flex items-center gap-1">
                            {report.sender_is_muted && (
                              <button onClick={() => handleUnmute(report.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors text-[9px] font-black uppercase tracking-widest flex items-center gap-1" title="Unmute">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                Unmute
                              </button>
                            )}
                            {report.sender_is_suspended && (
                              <button onClick={() => handleUnsuspend(report.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors text-[9px] font-black uppercase tracking-widest flex items-center gap-1" title="Unsuspend">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                Unsuspend
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Moderation;

