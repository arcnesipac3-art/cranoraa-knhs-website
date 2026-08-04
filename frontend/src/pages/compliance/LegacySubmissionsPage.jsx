import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useFetch } from '../../hooks/useFetch';
import api from '../../utils/api';
import toast from 'react-hot-toast';

/**
 * LegacySubmissionsPage
 * Lists compliance submissions with no classroom_subject (pre-Task-2 records).
 * Admin can bulk-assign them to the correct ClassroomSubject.
 */
export default function LegacySubmissionsPage() {
  const [legacy, setLegacy]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState({});   // { submissionId: classroomSubjectId }
  const [saving, setSaving]       = useState(false);
  const [csOptions, setCsOptions] = useState([]);   // flattened classroom-subject options

  const { data: classroomsData } = useFetch('/classrooms/');
  const classrooms = classroomsData?.results || classroomsData || [];

  // Load legacy submissions
  const loadLegacy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/compliance/legacy/');
      setLegacy(res.data?.results || res.data || []);
    } catch {
      toast.error('Failed to load legacy submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load classroom-subject options per classroom
  useEffect(() => {
    loadLegacy();
  }, [loadLegacy]);

  useEffect(() => {
    if (!classrooms.length) return;
    Promise.all(
      classrooms.map(c =>
        api.get(`/classroom-subjects/by_classroom/?classroom_id=${c.id}`)
          .then(r => (r.data || []).map(cs => ({
            id: cs.id,
            label: `${c.name} — ${cs.subject_name}`,
            teacher_id: cs.teacher,
          })))
          .catch(() => [])
      )
    ).then(results => setCsOptions(results.flat()));
  }, [classrooms.length]);

  const handleAssign = async (submissionId) => {
    const csId = selected[submissionId];
    if (!csId) { toast.error('Select a classroom/subject first'); return; }

    setSaving(true);
    try {
      const res = await api.post('/compliance/bulk-assign/', {
        submission_ids: [submissionId],
        classroom_subject_id: parseInt(csId),
      });
      toast.success(res.data.message || 'Assigned');
      setLegacy(prev => prev.filter(s => s.id !== submissionId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignAll = async () => {
    const pairs = Object.entries(selected).filter(([, csId]) => csId);
    if (!pairs.length) { toast.error('Select at least one assignment first'); return; }

    setSaving(true);
    let success = 0;
    for (const [subId, csId] of pairs) {
      try {
        await api.post('/compliance/bulk-assign/', {
          submission_ids: [parseInt(subId)],
          classroom_subject_id: parseInt(csId),
        });
        success++;
      } catch { /* continue */ }
    }
    toast.success(`Assigned ${success} submission(s)`);
    await loadLegacy();
    setSelected({});
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 h-16" />
        ))}
      </div>
    );
  }

  if (!legacy.length) {
    return (
      <div className="bg-white rounded-xl border border-emerald-200 p-12 text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-bold text-emerald-700">No legacy submissions!</p>
        <p className="text-xs text-slate-400 mt-1">All submissions are linked to a subject assignment.</p>
      </div>
    );
  }

  const readyCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Legacy Submissions</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {legacy.length} submission{legacy.length !== 1 ? 's' : ''} without a subject assignment
          </p>
        </div>
        {readyCount > 0 && (
          <button
            onClick={handleAssignAll}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            Assign {readyCount} Selected
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="text-sm font-bold text-amber-800">Migration required</p>
          <p className="text-xs text-amber-700 mt-0.5">
            These submissions were created before the subject-assignment system.
            Assign each one to the correct classroom &amp; subject so they appear in teacher dashboards and analytics.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_120px_180px_80px] px-5 py-3 bg-slate-50 border-b border-slate-100 gap-3">
          {['Teacher', 'Compliance Type', 'Period', 'Assign To', ''].map(h => (
            <span key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-slate-50">
          {legacy.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="grid grid-cols-[1fr_1fr_120px_180px_80px] px-5 py-3 items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-900 truncate">{sub.teacher_name}</p>
              <p className="text-sm text-slate-600 truncate">{sub.compliance_type_name}</p>
              <p className="text-xs text-slate-500">Period {sub.period_number}</p>
              <select
                value={selected[sub.id] || ''}
                onChange={e => setSelected(prev => ({ ...prev, [sub.id]: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="">— select —</option>
                {csOptions
                  .filter(cs => cs.teacher_id === sub.teacher || !cs.teacher_id)
                  .map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.label}</option>
                  ))
                }
                {/* Fallback: show all if no teacher match */}
                {csOptions.filter(cs => cs.teacher_id === sub.teacher).length === 0 &&
                  csOptions.map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.label}</option>
                  ))
                }
              </select>
              <button
                onClick={() => handleAssign(sub.id)}
                disabled={!selected[sub.id] || saving}
                className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
