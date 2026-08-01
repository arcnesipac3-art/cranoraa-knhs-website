import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../styles/designSystem';

const QUICK_ACTIONS = [
  {
    id: 'attendance',
    title: 'Mark Attendance',
    description: 'Record today\'s attendance',
    path: '/my-classes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    hoverBorder: 'hover:border-emerald-400',
    priority: 1,
  },
  {
    id: 'grades',
    title: 'Input Grades',
    description: 'Submit and manage grades',
    path: '/grade-input',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: 'violet',
    gradient: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
    hoverBorder: 'hover:border-violet-400',
    priority: 2,
  },
  {
    id: 'announce',
    title: 'Post Announcement',
    description: 'Share updates with students',
    path: '/announcements',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    hoverBorder: 'hover:border-amber-400',
    priority: 3,
  },
  {
    id: 'schedule',
    title: 'View Schedule',
    description: 'Check your weekly timetable',
    path: '/my-schedule',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hoverBorder: 'hover:border-blue-400',
    priority: 4,
  },
  {
    id: 'communication',
    title: 'Messages',
    description: 'Communicate with students',
    path: '/communication-center',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    color: 'rose',
    gradient: 'from-rose-500 to-rose-600',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    hoverBorder: 'hover:border-rose-400',
    priority: 5,
  },
  {
    id: 'quiz',
    title: 'Create Quiz',
    description: 'Build assessments for classes',
    path: '/my-classes?view=quizzes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'indigo',
    gradient: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    hoverBorder: 'hover:border-indigo-400',
    priority: 6,
  },
  {
    id: 'lesson-plan',
    title: 'Lesson Plans',
    description: 'Manage teaching plans',
    path: '/my-classes?view=lesson-plans',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'teal',
    gradient: 'from-teal-500 to-teal-600',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
    hoverBorder: 'hover:border-teal-400',
    priority: 7,
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'View class performance data',
    path: '/my-classes?view=analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'sky',
    gradient: 'from-sky-500 to-sky-600',
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-200',
    hoverBorder: 'hover:border-sky-400',
    priority: 8,
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

const QuickActionCards = memo(({ pendingGrades = 0, unmarkedCount = 0 }) => {
  const navigate = useNavigate();

  const sortedActions = [...QUICK_ACTIONS].sort((a, b) => a.priority - b.priority);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Quick Actions</h2>
        {(unmarkedCount > 0 || pendingGrades > 0) && (
          <div className="flex items-center gap-2">
            {unmarkedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {unmarkedCount} unmarked
              </span>
            )}
            {pendingGrades > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {pendingGrades} pending grades
              </span>
            )}
          </div>
        )}
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5"
      >
        {sortedActions.map(action => (
          <motion.button
            key={action.id}
            variants={item}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.path)}
            className={cn(
              'group relative flex flex-col items-start p-3.5 rounded-xl border-2 bg-white text-left transition-all duration-200',
              action.border,
              action.hoverBorder,
              'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1'
            )}
            aria-label={`Navigate to ${action.title}`}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 shadow-sm', action.bg, action.text)}>
              {action.icon}
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 leading-tight group-hover:text-violet-700 transition-colors">
              {action.title}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug line-clamp-2">
              {action.description}
            </p>
            <svg
              className="absolute top-3.5 right-3.5 w-4 h-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
});

QuickActionCards.displayName = 'QuickActionCards';
export default QuickActionCards;
