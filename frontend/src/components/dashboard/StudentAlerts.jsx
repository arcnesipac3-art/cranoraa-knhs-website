import { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../styles/designSystem';
import api from '../../utils/api';

const SEV = {
  critical: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   iconBg: 'bg-red-100',   leftBorder: 'border-l-red-500',   dot: 'bg-red-500',    label: 'Critical' },
  warning:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', iconBg: 'bg-amber-100', leftBorder: 'border-l-amber-400', dot: 'bg-amber-500',  label: 'Warning'  },
  info:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  iconBg: 'bg-blue-100',  leftBorder: 'border-l-blue-400',  dot: 'bg-blue-400',   label: 'Info'     },
};

const ALERT_ICONS = {
  absent:   'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  perf:     'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6',
  missing:  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  behavior: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
};

const StudentAlerts = memo(() => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/teacher/stats/')
      .then(r => {
        const stats = r.data || {};
        const generated = [];
        if (stats.absent_3plus_days > 0) generated.push({
          id: 'absent', severity: 'critical', iconKey: 'absent', path: '/my-classes',
          title: 'Consecutive Absences',
          description: `${stats.absent_3plus_days} student${stats.absent_3plus_days > 1 ? 's' : ''} absent for 3+ consecutive days`,
          count: stats.absent_3plus_days,
        });
        if (stats.low_performing > 0) generated.push({
          id: 'low-perf', severity: 'warning', iconKey: 'perf', path: '/my-classes',
          title: 'Low Performing Students',
          description: `${stats.low_performing} student${stats.low_performing > 1 ? 's' : ''} below passing grade`,
          count: stats.low_performing,
        });
        if (stats.missing_submissions > 0) generated.push({
          id: 'missing', severity: 'warning', iconKey: 'missing', path: '/my-classes',
          title: 'Missing Submissions',
          description: `${stats.missing_submissions} assignment${stats.missing_submissions > 1 ? 's' : ''} not submitted`,
          count: stats.missing_submissions,
        });
        if (stats.behavior_reports > 0) generated.push({
          id: 'behavior', severity: 'critical', iconKey: 'behavior', path: '/my-classes',
          title: 'Behavior Reports',
          description: `${stats.behavior_reports} report${stats.behavior_reports > 1 ? 's' : ''} pending review`,
          count: stats.behavior_reports,
        });
        setAlerts(generated);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Student Alerts</h3>
            <p className="text-[10px] text-slate-500 font-medium">
              {loading ? 'Loading…' : alerts.length === 0 ? 'No alerts' : `${alerts.length} item${alerts.length > 1 ? 's' : ''} requiring attention`}
            </p>
          </div>
        </div>
        {criticalCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {criticalCount} critical
          </span>
        )}
      </div>

      <div className="px-4 py-3 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2].map(i => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-600">No student alerts</p>
            <p className="text-xs text-slate-400 mt-1">All students are on track</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, idx) => {
              const sev = SEV[alert.severity];
              return (
                <motion.button key={alert.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(alert.path)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border border-l-4 text-left group transition-all hover:shadow-sm',
                    sev.bg, sev.border, sev.leftBorder
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', sev.iconBg)}>
                    <svg className={cn('w-4 h-4', sev.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ALERT_ICONS[alert.iconKey]} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn('text-sm font-bold', sev.text)}>{alert.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{alert.description}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <span className={cn('text-base font-extrabold', sev.text)}>{alert.count}</span>
                    <span className={cn('text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border', sev.bg, sev.text, sev.border)}>
                      {sev.label}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

StudentAlerts.displayName = 'StudentAlerts';
export default StudentAlerts;
