import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useComplianceDashboard } from '../../hooks/useCompliance';

const STAT_CONFIG = {
  total: { label: 'Total', icon: '📋', color: 'text-slate-900', bg: 'bg-white', border: 'border-slate-200', ring: 'ring-slate-100' },
  reviewed: { label: 'Reviewed', icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-100' },
  pending: { label: 'Pending', icon: '⏳', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-100' },
  overdue: { label: 'Overdue', icon: '⚠️', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-100' },
  rejected: { label: 'Rejected', icon: '❌', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-100' },
};

export default function ComplianceDashboardPage() {
  const { stats, loading, fetchStats } = useComplianceDashboard();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-16 mb-2" />
              <div className="h-8 bg-slate-200 rounded w-12" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-40 mb-4" />
          <div className="h-6 bg-slate-100 rounded-full" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { key: 'total', value: stats.total_submissions },
    { key: 'reviewed', value: stats.reviewed_count },
    { key: 'pending', value: stats.pending_count },
    { key: 'overdue', value: stats.overdue_count },
    { key: 'rejected', value: stats.rejected_count },
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

  const getRateLabel = (rate) => {
    if (rate >= 80) return 'Good';
    if (rate >= 50) return 'Needs Improvement';
    return 'Critical';
  };

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((card, i) => {
          const cfg = STAT_CONFIG[card.key];
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${cfg.bg} rounded-xl border ${cfg.border} p-4`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{cfg.icon}</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cfg.label}</p>
              </div>
              <p className={`text-3xl font-extrabold ${cfg.color}`}>{card.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Overall Compliance Rate */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-slate-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Overall Compliance Rate</h3>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            stats.compliance_rate >= 80 ? 'bg-emerald-50 text-emerald-700' :
            stats.compliance_rate >= 50 ? 'bg-amber-50 text-amber-700' :
            'bg-red-50 text-red-700'
          }`}>
            {getRateLabel(stats.compliance_rate)}
          </span>
        </div>
        <div className="flex items-end gap-4">
          <span className={`text-5xl font-extrabold ${getRateColor(stats.compliance_rate)}`}>
            {stats.compliance_rate}%
          </span>
          <div className="flex-1 pb-1">
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(stats.compliance_rate, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${getRateBg(stats.compliance_rate)}`}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-400 font-medium">0%</span>
              <span className="text-[10px] text-slate-400 font-medium">100%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* By Type */}
      {stats.by_type?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Compliance by Type</h3>
          <div className="space-y-3">
            {stats.by_type.map((item, i) => {
              const rate = item.total > 0 ? Math.round((item.reviewed_count / item.total) * 100) : 0;
              return (
                <div key={i} className="group">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-sm font-bold text-slate-700 w-44 truncate">
                      {item.compliance_type__name}
                    </span>
                    <div className="flex-1">
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(rate, 100)}%` }}
                          transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                          className={`h-full rounded-full ${getRateBg(rate)}`}
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${getRateColor(rate)} w-12 text-right`}>{rate}%</span>
                    <span className="text-[10px] text-slate-400 w-20 text-right font-medium">
                      {item.reviewed_count}/{item.total}
                    </span>
                  </div>
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
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Per-Teacher Compliance</h3>
          </div>

          {/* Table Header */}
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">Teacher</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Total</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Done</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Pending</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Overdue</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">Rate</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {stats.by_teacher.map((item, i) => {
              const teacherName = item.teacher__first_name && item.teacher__last_name
                ? `${item.teacher__first_name} ${item.teacher__last_name}`
                : item.teacher__username;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.03 }}
                  className="px-6 py-3.5 flex items-center hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{teacherName}</p>
                  </div>
                  <span className="w-16 text-center text-sm font-medium text-slate-600">{item.total}</span>
                  <span className="w-16 text-center text-sm font-bold text-emerald-600">{item.reviewed_count}</span>
                  <span className="w-16 text-center text-sm font-bold text-blue-600">{item.pending_count}</span>
                  <span className="w-16 text-center text-sm font-bold text-amber-600">{item.overdue_count}</span>
                  <div className="w-20 text-center">
                    <span className={`inline-flex items-center gap-1 text-sm font-bold ${getRateColor(item.rate)}`}>
                      {item.rate}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
