import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../styles/designSystem';
import api from '../../utils/api';

const getLocalDateStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const SEVERITY = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Critical' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Warning' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Info' },
};

const StudentAlerts = memo(() => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const today = getLocalDateStr();

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/attendance/?date=${today}`).catch(() => ({ data: [] }));
        if (cancelled) return;
        const records = Array.isArray(res.data) ? res.data : [];

        const absent = records.filter(r => r.status === 'absent');
        const late = records.filter(r => r.status === 'late');

        const generated = [];
        if (absent.length > 0) {
          generated.push({
            id: 'absent',
            title: `${absent.length} Student${absent.length > 1 ? 's' : ''} Absent`,
            description: absent.slice(0, 3).map(r => r.student_name).filter(Boolean).join(', ') || 'Marked absent today',
            severity: 'critical',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ),
          });
        }
        if (late.length > 0) {
          generated.push({
            id: 'late',
            title: `${late.length} Student${late.length > 1 ? 's' : ''} Late`,
            description: late.slice(0, 3).map(r => r.student_name).filter(Boolean).join(', ') || 'Marked late today',
            severity: 'warning',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          });
        }
        setAlerts(generated);
      } catch {
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Student Alerts</h3>
          <p className="text-[10px] text-slate-500 font-medium">Today&apos;s attendance exceptions</p>
        </div>
      </div>
      <div className="px-4 md:px-5 py-3 flex-1 min-h-0">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                <div className="skeleton-shimmer w-8 h-8 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton-shimmer h-3 w-3/4 rounded bg-slate-200" />
                  <div className="skeleton-shimmer h-2.5 w-1/2 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center h-full">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-slate-500 font-medium">No student alerts today</p>
            <p className="text-[10px] text-slate-400 mt-0.5">No absences or late marks recorded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, idx) => {
              const severity = SEVERITY[alert.severity];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    severity.border, severity.bg
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', severity.bg, severity.text)}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn('text-sm font-bold', severity.text)}>{alert.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{alert.description}</p>
                  </div>
                  <span className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0',
                    severity.bg, severity.text, severity.border
                  )}>
                    {severity.label}
                  </span>
                </motion.div>
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
