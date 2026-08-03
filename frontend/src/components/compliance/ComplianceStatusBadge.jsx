import React from 'react';

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  submitted: {
    label: 'Submitted',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  reviewed: {
    label: 'Reviewed',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  overdue: {
    label: 'Overdue',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
};

export default function ComplianceStatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold uppercase rounded-md border ${config.color} ${sizeClasses[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
