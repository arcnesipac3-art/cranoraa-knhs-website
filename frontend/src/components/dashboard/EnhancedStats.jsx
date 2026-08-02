import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../styles/designSystem';

const ProgressBar = ({ value, color = 'bg-violet-500' }) => (
  <div className="w-full bg-slate-100 rounded-full overflow-hidden h-1.5 mt-2.5">
    <motion.div
      className={cn('h-1.5 rounded-full', color)}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
    />
  </div>
);

const stats_config = [
  {
    key: 'attendance',
    label: "Today's Attendance",
    color: 'emerald',
    ring: '#059669',
    bar: 'bg-emerald-500',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    accentBorder: 'border-l-emerald-500',
    navigateTo: '/my-classes',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'grades',
    label: 'Pending Grades',
    color: 'rose',
    ring: '#dc2626',
    bar: 'bg-rose-500',
    iconBg: 'bg-rose-50',
    iconText: 'text-rose-600',
    accentBorder: 'border-l-rose-500',
    navigateTo: '/grade-input',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    key: 'students',
    label: 'Total Students',
    color: 'blue',
    ring: '#2563eb',
    bar: 'bg-blue-500',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    accentBorder: 'border-l-blue-500',
    navigateTo: '/my-classes',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    key: 'classes',
    label: "My Classes",
    color: 'violet',
    ring: '#7c3aed',
    bar: 'bg-violet-500',
    iconBg: 'bg-violet-50',
    iconText: 'text-violet-600',
    accentBorder: 'border-l-violet-500',
    navigateTo: '/my-classes',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    key: 'gradesTotal',
    label: 'Grade Records',
    color: 'sky',
    ring: '#0284c7',
    bar: 'bg-sky-500',
    iconBg: 'bg-sky-50',
    iconText: 'text-sky-600',
    accentBorder: 'border-l-sky-500',
    navigateTo: '/my-classes',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const EnhancedStats = memo(({ classrooms = [], data = {}, unmarkedCount = 0 }) => {
  const navigate = useNavigate();

  const attRate = data?.attendance_rate ?? 0;
  const pendingGrades = data?.pending_grades ?? 0;
  const totalStudents = data?.total_students ?? 0;
  const totalGrades = data?.total_grades ?? 0;

  const stats = [
    {
      key: 'attendance',
      value: `${attRate}%`,
      sub: unmarkedCount > 0 ? `${unmarkedCount} class${unmarkedCount > 1 ? 'es' : ''} unmarked` : 'All classes marked ✓',
      progress: attRate,
      alert: unmarkedCount > 0 ? { text: `${unmarkedCount} unmarked`, cls: 'bg-amber-50 text-amber-700 border-amber-200' } : null,
      urgent: unmarkedCount > 0,
    },
    {
      key: 'grades',
      value: pendingGrades === 0 ? 'All done' : pendingGrades,
      sub: pendingGrades > 0 ? `${pendingGrades} missing grade${pendingGrades > 1 ? 's' : ''}` : 'Up to date',
      progress: totalGrades > 0 ? Math.max(0, ((totalGrades - pendingGrades) / totalGrades) * 100) : 100,
      alert: pendingGrades > 0 ? { text: `${pendingGrades} pending`, cls: 'bg-rose-50 text-rose-700 border-rose-200' } : null,
      urgent: pendingGrades > 0,
    },
    {
      key: 'students',
      value: totalStudents,
      sub: `Across ${classrooms.length} class${classrooms.length !== 1 ? 'es' : ''}`,
      progress: Math.min(100, (totalStudents / 200) * 100),
      alert: null, urgent: false,
    },
    {
      key: 'classes',
      value: classrooms.length,
      sub: classrooms.length === 0 ? 'None assigned' : 'Active sections',
      progress: Math.min(100, (classrooms.length / 8) * 100),
      alert: null, urgent: false,
    },
    {
      key: 'gradesTotal',
      value: totalGrades,
      sub: 'Total entries',
      progress: Math.min(100, (totalGrades / 500) * 100),
      alert: null, urgent: false,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Overview</h2>
        {(unmarkedCount > 0 || pendingGrades > 0) && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Action needed
          </span>
        )}
      </div>
      <motion.div variants={container} initial="hidden" animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {stats.map(stat => {
          const cfg = stats_config.find(c => c.key === stat.key);
          return (
            <motion.button
              key={stat.key}
              variants={item}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(cfg.navigateTo)}
              className={cn(
                'relative group bg-white rounded-xl border-l-4 border border-slate-200 p-4',
                'hover:shadow-md hover:border-slate-300 transition-all duration-200 text-left',
                'focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1',
                cfg.accentBorder,
                stat.urgent && 'ring-1 ring-rose-200'
              )}
            >
              {stat.alert && (
                <span className={cn(
                  'absolute top-2 right-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border',
                  stat.alert.cls
                )}>
                  {stat.alert.text}
                </span>
              )}
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', cfg.iconBg, cfg.iconText)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cfg.icon} />
                </svg>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{cfg.label}</p>
              <h3 className="text-2xl font-extrabold text-slate-900 leading-none mt-1">{stat.value}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">{stat.sub}</p>
              <ProgressBar value={stat.progress} color={cfg.bar} />
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
});

EnhancedStats.displayName = 'EnhancedStats';
export default EnhancedStats;
