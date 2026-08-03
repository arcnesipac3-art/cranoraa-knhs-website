import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useComplianceDashboard } from '../../hooks/useCompliance';

export default function ComplianceDashboardPage() {
  const { stats, loading, fetchStats } = useComplianceDashboard();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
              <div className="h-8 bg-slate-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total', value: stats.total_submissions, color: 'text-slate-900', bg: 'bg-slate-50' },
    { label: 'Reviewed', value: stats.reviewed_count, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending', value: stats.pending_count, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Overdue', value: stats.overdue_count, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const getRateColor = (rate) => {
    if (rate >= 80) return 'text-emerald-600';
    if (rate >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getRateBg = (rate) => {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${card.bg} rounded-xl border border-slate-100 p-5`}
          >
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
            <p className={`text-3xl font-extrabold ${card.color} mt-1`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Overall Rate */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-slate-200 p-6"
      >
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Overall Compliance Rate</h3>
        <div className="flex items-center gap-4">
          <span className={`text-5xl font-extrabold ${getRateColor(stats.compliance_rate)}`}>
            {stats.compliance_rate}%
          </span>
          <div className="flex-1">
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getRateBg(stats.compliance_rate)}`}
                style={{ width: `${Math.min(stats.compliance_rate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* By Type */}
      {stats.by_type?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Compliance by Type</h3>
          <div className="space-y-3">
            {stats.by_type.map((item, i) => {
              const rate = item.total > 0 ? Math.round((item.reviewed_count / item.total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-700 w-40 truncate">
                    {item.compliance_type__name}
                  </span>
                  <div className="flex-1">
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getRateBg(rate)}`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${getRateColor(rate)} w-12 text-right`}>{rate}%</span>
                  <span className="text-xs text-slate-400 w-20 text-right">
                    {item.reviewed_count}/{item.total}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* By Teacher */}
      {stats.by_teacher?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-6 pb-0">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Per-Teacher Compliance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Reviewed</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pending</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Overdue</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.by_teacher.map((item, i) => {
                  const teacherName = item.teacher__first_name && item.teacher__last_name
                    ? `${item.teacher__first_name} ${item.teacher__last_name}`
                    : item.teacher__username;
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-sm font-medium text-slate-900">{teacherName}</td>
                      <td className="px-6 py-3.5 text-sm text-slate-600 text-center">{item.total}</td>
                      <td className="px-6 py-3.5 text-sm text-emerald-600 text-center font-medium">{item.reviewed_count}</td>
                      <td className="px-6 py-3.5 text-sm text-blue-600 text-center font-medium">{item.pending_count}</td>
                      <td className="px-6 py-3.5 text-sm text-amber-600 text-center font-medium">{item.overdue_count}</td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`text-sm font-bold ${getRateColor(item.rate)}`}>
                          {item.rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
