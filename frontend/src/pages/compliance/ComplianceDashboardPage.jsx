import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useComplianceDashboard } from '../../hooks/useCompliance';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── helpers ────────────────────────────────────────────────────────────────────
const rateColor  = r => r >= 80 ? 'text-emerald-600' : r >= 50 ? 'text-amber-600' : 'text-red-600';
const rateBg     = r => r >= 80 ? 'bg-emerald-500'   : r >= 50 ? 'bg-amber-500'   : 'bg-red-500';
const rateLabel  = r => r >= 80 ? 'Good'             : r >= 50 ? 'Needs Work'     : 'Critical';
const ratePillCls = r =>
  r >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
  : r >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200'
  : 'bg-red-50 text-red-700 border-red-200';

function RateBar({ rate, delay = 0 }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(rate, 100)}%` }}
          transition={{ duration: 0.6, delay, ease: 'easeOut' }}
          className={`h-full rounded-full ${rateBg(rate)}`}
        />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${rateColor(rate)}`}>{rate}%</span>
    </div>
  );
}

function StatCard({ label, value, colorCls, bgCls, borderCls, icon, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`${bgCls} rounded-xl border ${borderCls} p-4`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{icon}</span>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-3xl font-extrabold ${colorCls}`}>{value ?? 0}</p>
    </motion.div>
  );
}

// ── FilterBar ─────────────────────────────────────────────────────────────────
function FilterBar({ filters, setFilters, subjects, academicYears, semesters }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Academic Year
          </label>
          <select
            value={filters.academic_year_id}
            onChange={e => setFilters(f => ({ ...f, academic_year_id: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Active Year</option>
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Semester
          </label>
          <select
            value={filters.semester_id}
            onChange={e => setFilters(f => ({ ...f, semester_id: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Semesters</option>
            {semesters.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Subject
          </label>
          <select
            value={filters.subject_id}
            onChange={e => setFilters(f => ({ ...f, subject_id: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── MissingSubmissionsTable ────────────────────────────────────────────────────
function MissingSubmissionsTable({ rows }) {
  const [search, setSearch] = useState('');
  const filtered = search
    ? rows.filter(r =>
        r.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
        r.subject_name.toLowerCase().includes(search.toLowerCase()) ||
        r.compliance_type.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  if (!rows.length) {
    return (
      <div className="bg-white rounded-xl border border-emerald-200 p-8 text-center">
        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-bold text-emerald-700">No missing submissions!</p>
        <p className="text-xs text-slate-400 mt-1">All teachers are compliant for the current period.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Missing Submissions</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{rows.length} item{rows.length !== 1 ? 's' : ''} need attention</p>
        </div>
        <div className="relative w-56">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Teacher', 'Subject', 'Classroom', 'Compliance Type', 'Status', 'Deadline', 'Days Overdue'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((row, i) => (
              <tr key={i} className={`hover:bg-slate-50 transition-colors ${row.days_overdue > 0 ? 'bg-red-50/30' : ''}`}>
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{row.teacher_name}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  <span className="font-bold text-violet-600 mr-1">{row.subject_code}</span>
                  {row.subject_name}
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.classroom_name}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{row.compliance_type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    row.current_status === 'not_started' ? 'bg-slate-50 text-slate-500 border-slate-200'
                    : row.current_status === 'overdue'    ? 'bg-red-50 text-red-700 border-red-200'
                    : row.current_status === 'rejected'   ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {row.current_status === 'not_started' ? 'Not Started' : row.current_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                  {row.deadline ? new Date(row.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.days_overdue > 0
                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{row.days_overdue}d</span>
                    : <span className="text-slate-300 text-xs">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ComplianceDashboardPage() {
  const { stats, loading, fetchStats } = useComplianceDashboard();
  const [filters, setFilters] = useState({
    academic_year_id: '',
    semester_id: '',
    subject_id: '',
  });
  const [subjects, setSubjects]         = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters]       = useState([]);
  const [triggering, setTriggering]     = useState(false);
  const [activeSection, setActiveSection] = useState('overview'); // overview | by_subject | by_teacher | missing

  // Load filter options once
  useEffect(() => {
    Promise.all([
      api.get('/subjects/').catch(() => ({ data: [] })),
      api.get('/academic-years/').catch(() => ({ data: [] })),
      api.get('/semesters/').catch(() => ({ data: [] })),
    ]).then(([subj, ay, sem]) => {
      setSubjects(Array.isArray(subj.data) ? subj.data : subj.data?.results ?? []);
      setAcademicYears(Array.isArray(ay.data) ? ay.data : ay.data?.results ?? []);
      setSemesters(Array.isArray(sem.data) ? sem.data : sem.data?.results ?? []);
    });
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    const params = {};
    if (filters.academic_year_id) params.academic_year_id = filters.academic_year_id;
    if (filters.semester_id)      params.semester_id      = filters.semester_id;
    if (filters.subject_id)       params.subject_id       = filters.subject_id;
    fetchStats(params);
  }, [filters, fetchStats]);

  const handleTriggerReminders = useCallback(async (dry) => {
    setTriggering(true);
    try {
      const res = await api.post('/compliance/trigger-reminders/', { dry_run: dry });
      const d = res.data;
      toast.success(
        `${dry ? '[Dry Run] ' : ''}Reminders: ${d.total_reminders_sent} · Overdue alerts: ${d.total_overdue_alerts}`
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to trigger reminders');
    } finally {
      setTriggering(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-20 bg-white rounded-xl border border-slate-200" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-slate-200" />)}
        </div>
        <div className="h-48 bg-white rounded-xl border border-slate-200" />
        <div className="h-64 bg-white rounded-xl border border-slate-200" />
      </div>
    );
  }

  if (!stats) return null;

  const STAT_CARDS = [
    { label: 'Total',    value: stats.total_submissions, icon: '📋', colorCls: 'text-slate-900',   bgCls: 'bg-white',       borderCls: 'border-slate-200' },
    { label: 'Reviewed', value: stats.reviewed_count,   icon: '✅', colorCls: 'text-emerald-600', bgCls: 'bg-emerald-50',  borderCls: 'border-emerald-200' },
    { label: 'Pending',  value: stats.pending_count,    icon: '⏳', colorCls: 'text-blue-600',    bgCls: 'bg-blue-50',     borderCls: 'border-blue-200' },
    { label: 'Overdue',  value: stats.overdue_count,    icon: '⚠️', colorCls: 'text-amber-600',   bgCls: 'bg-amber-50',    borderCls: 'border-amber-200' },
    { label: 'Rejected', value: stats.rejected_count,   icon: '❌', colorCls: 'text-red-600',     bgCls: 'bg-red-50',      borderCls: 'border-red-200' },
  ];

  const SECTIONS = [
    { id: 'overview',    label: 'Overview' },
    { id: 'by_subject',  label: 'By Subject' },
    { id: 'by_teacher',  label: 'By Teacher' },
    { id: 'missing',     label: `Missing (${stats.missing_submissions?.length ?? 0})` },
  ];

  return (
    <div className="space-y-5">

      {/* Filters */}
      <FilterBar
        filters={filters} setFilters={setFilters}
        subjects={subjects} academicYears={academicYears} semesters={semesters}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STAT_CARDS.map((c, i) => (
          <StatCard key={c.label} {...c} delay={i * 0.05} />
        ))}
      </div>

      {/* Rate + trigger row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Overall Compliance Rate</h3>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ratePillCls(stats.compliance_rate)}`}>
              {rateLabel(stats.compliance_rate)}
            </span>
          </div>
          <div className="flex items-end gap-4">
            <span className={`text-4xl font-extrabold ${rateColor(stats.compliance_rate)}`}>
              {stats.compliance_rate}%
            </span>
            <div className="flex-1 pb-1">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stats.compliance_rate, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${rateBg(stats.compliance_rate)}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Trigger reminders */}
        <div className="flex flex-col gap-2 sm:border-l sm:pl-5 sm:border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Send Reminders</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleTriggerReminders(true)}
              disabled={triggering}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Dry Run
            </button>
            <button
              onClick={() => handleTriggerReminders(false)}
              disabled={triggering}
              className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {triggering ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )}
              Send Now
            </button>
          </div>
        </div>
      </motion.div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeSection === s.id
                ? 'bg-violet-600 text-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Overview: by type ─────────────────────────────────────────────── */}
      {activeSection === 'overview' && stats.by_type?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Compliance by Type</h3>
          <div className="space-y-3">
            {stats.by_type.map((item, i) => {
              const r = item.total > 0 ? Math.round(item.reviewed_count / item.total * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                      {item.compliance_type__name}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2 shrink-0">
                      {item.reviewed_count}/{item.total}
                    </span>
                  </div>
                  <RateBar rate={r} delay={0.4 + i * 0.06} />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── By Subject ───────────────────────────────────────────────────── */}
      {activeSection === 'by_subject' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Compliance by Subject</h3>
          {!stats.by_subject?.length ? (
            <p className="text-sm text-slate-400 text-center py-8">No subject-linked submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.by_subject.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded shrink-0">
                        {item.subject_code}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 truncate">{item.subject_name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {item.overdue_count > 0 && (
                        <span className="text-[10px] font-bold text-red-600">{item.overdue_count} overdue</span>
                      )}
                      <span className="text-[10px] text-slate-400">{item.reviewed_count}/{item.total}</span>
                    </div>
                  </div>
                  <RateBar rate={item.rate} delay={0.1 + i * 0.05} />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── By Teacher ───────────────────────────────────────────────────── */}
      {activeSection === 'by_teacher' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Per-Teacher Compliance</h3>
          </div>
          {!stats.by_teacher?.length ? (
            <p className="text-sm text-slate-400 text-center py-8">No data.</p>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_80px_100px] px-5 py-2 bg-slate-50 border-b border-slate-100">
                {['Teacher','Total','Done','Pending','Overdue','Rate'].map(h => (
                  <span key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-center first:text-left">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-slate-50">
                {stats.by_teacher.map((item, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }}
                    className="px-5 py-3 flex flex-col md:grid md:grid-cols-[1fr_80px_80px_80px_80px_100px] items-start md:items-center gap-2 md:gap-0 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {(item.teacher_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-900 truncate">{item.teacher_name}</span>
                    </div>
                    <span className="md:text-center text-sm text-slate-500 w-full md:w-auto">
                      <span className="md:hidden text-[10px] text-slate-400 mr-1">Total:</span>{item.total}
                    </span>
                    <span className="md:text-center text-sm font-bold text-emerald-600 w-full md:w-auto">
                      <span className="md:hidden text-[10px] text-slate-400 mr-1">Done:</span>{item.reviewed_count}
                    </span>
                    <span className="md:text-center text-sm font-bold text-blue-600 w-full md:w-auto">
                      <span className="md:hidden text-[10px] text-slate-400 mr-1">Pending:</span>{item.pending_count}
                    </span>
                    <span className="md:text-center text-sm font-bold text-amber-600 w-full md:w-auto">
                      <span className="md:hidden text-[10px] text-slate-400 mr-1">Overdue:</span>{item.overdue_count}
                    </span>
                    <div className="md:text-center w-full md:w-auto">
                      <span className={`inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-full border ${ratePillCls(item.rate)}`}>
                        {item.rate}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* ── Missing Submissions ───────────────────────────────────────────── */}
      {activeSection === 'missing' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <MissingSubmissionsTable rows={stats.missing_submissions ?? []} />
        </motion.div>
      )}

    </div>
  );
}
