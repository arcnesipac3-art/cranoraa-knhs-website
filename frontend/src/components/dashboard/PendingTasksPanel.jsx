import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../styles/designSystem';

const URGENCY = {
  high:   { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   iconBg: 'bg-rose-100',   leftBorder: 'border-l-rose-500',   badge: 'bg-rose-100 text-rose-700' },
  medium: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  iconBg: 'bg-amber-100',  leftBorder: 'border-l-amber-400',  badge: 'bg-amber-100 text-amber-700' },
  low:    { bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200',  iconBg: 'bg-slate-100',  leftBorder: 'border-l-slate-300',  badge: 'bg-slate-100 text-slate-600' },
};

const ICONS = {
  attendance: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  grades:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  alert:      'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  check:      'M5 13l4 4L19 7',
};

const PendingTasksPanel = memo(({ unmarkedCount = 0, pendingGrades = 0, classrooms = [], todayAttMap = {} }) => {
  const navigate = useNavigate();
  const tasks = [];

  if (unmarkedCount > 0) {
    tasks.push({
      id: 'attendance', urgency: 'high', path: '/my-classes',
      title: 'Submit Attendance',
      description: `${unmarkedCount} class${unmarkedCount > 1 ? 'es' : ''} need attendance today`,
      icon: ICONS.attendance,
      cta: 'Mark Now',
    });
  }

  if (pendingGrades > 0) {
    tasks.push({
      id: 'grades', urgency: 'high', path: '/grade-input',
      title: 'Grade Submissions',
      description: `${pendingGrades} student${pendingGrades > 1 ? 's' : ''} missing grades`,
      icon: ICONS.grades,
      cta: 'Input Grades',
    });
  }

  const lowAttClasses = classrooms.filter(c => {
    const att = todayAttMap[c.id];
    if (!att?.marked || att.totalCount === 0) return false;
    return (att.presentCount / att.totalCount) * 100 < 75;
  });

  if (lowAttClasses.length > 0) {
    tasks.push({
      id: 'low-att', urgency: 'medium', path: '/my-classes',
      title: 'Low Attendance Alert',
      description: `${lowAttClasses.length} class${lowAttClasses.length > 1 ? 'es' : ''} below 75% today`,
      icon: ICONS.alert,
      cta: 'Review',
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.check} />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Pending Tasks</h3>
            <p className="text-[10px] text-slate-500 font-medium">All caught up!</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-700">All tasks complete</p>
          <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
            You&apos;re up to date. Great work!
          </p>
        </div>
      </div>
    );
  }

  const highCount = tasks.filter(t => t.urgency === 'high').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Pending Tasks</h3>
            <p className="text-[10px] text-slate-500 font-medium">{tasks.length} item{tasks.length > 1 ? 's' : ''} needing attention</p>
          </div>
        </div>
        {highCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            {highCount} urgent
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-2 flex-1 overflow-y-auto">
        {tasks.map((task, idx) => {
          const u = URGENCY[task.urgency];
          return (
            <motion.button key={task.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ x: 2, transition: { duration: 0.1 } }}
              onClick={() => navigate(task.path)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border border-l-4 text-left group transition-all',
                u.bg, u.border, u.leftBorder, 'hover:shadow-sm'
              )}
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', u.iconBg)}>
                <svg className={cn('w-4 h-4', u.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={task.icon} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={cn('text-sm font-bold', u.text)}>{task.title}</h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{task.description}</p>
              </div>
              <span className={cn('shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg', u.badge)}>
                {task.cta}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

PendingTasksPanel.displayName = 'PendingTasksPanel';
export default PendingTasksPanel;
