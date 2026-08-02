import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../styles/designSystem';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const QuickBtn = ({ icon, label, onClick, color = 'violet' }) => {
  const colors = {
    violet: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200',
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200',
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
  };
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={cn('flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all', colors[color])}
      aria-label={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

const MyClassesWidget = memo(({ classrooms = [], todayAttMap = {}, classroomSubjectCodes = {}, classGrades = {} }) => {
  const navigate = useNavigate();

  if (classrooms.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">My Classes</h3>
            <p className="text-[10px] text-slate-500 font-medium">No classes assigned yet</p>
          </div>
        </div>
        <div className="px-5 py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-600">No classes assigned yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Contact your administrator to get class assignments.</p>
          <button onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">My Classes</h3>
            <p className="text-[10px] text-slate-500 font-medium">{classrooms.length} section{classrooms.length !== 1 ? 's' : ''} assigned</p>
          </div>
        </div>
        <button onClick={() => navigate('/my-classes')}
          className="text-[11px] font-bold text-violet-600 hover:text-violet-700 uppercase tracking-wide transition-colors">
          View All
        </button>
      </div>

      <div className="p-3 md:p-4">
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {classrooms.map(c => {
            const att = todayAttMap[c.id];
            const marked = att?.marked ?? false;
            const attRate = att?.totalCount > 0 ? Math.round((att.presentCount / att.totalCount) * 100) : null;
            const codes = classroomSubjectCodes[c.id] || [];
            const avgGrade = classGrades[c.id];
            const attColor = attRate == null ? 'bg-slate-100' : attRate >= 85 ? 'bg-emerald-500' : attRate >= 70 ? 'bg-amber-500' : 'bg-rose-500';

            return (
              <motion.div key={c.id} variants={item}
                className="relative flex flex-col rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all overflow-hidden group">
                {/* Card accent strip */}
                <div className={cn('h-1 w-full', marked ? 'bg-emerald-400' : 'bg-amber-400')} />

                <div className="p-4 flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                        {c.name}
                      </h4>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {codes.slice(0, 3).map(code => (
                          <span key={code} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 border border-violet-100 uppercase tracking-wide">
                            {code}
                          </span>
                        ))}
                        {codes.length > 3 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200">
                            +{codes.length - 3}
                          </span>
                        )}
                        {codes.length === 0 && (
                          <span className="text-[10px] font-medium text-slate-400">General</span>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      'shrink-0 ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border',
                      marked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', marked ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse')} />
                      {marked ? 'Att. Done' : 'Mark Att.'}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {c.student_count || 0} students
                    </div>
                    {avgGrade != null && (
                      <div className={cn(
                        'flex items-center gap-1 text-[11px] font-bold',
                        avgGrade >= 75 ? 'text-emerald-600' : avgGrade >= 60 ? 'text-amber-600' : 'text-rose-600'
                      )}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Avg {avgGrade}
                      </div>
                    )}
                  </div>

                  {/* Attendance mini bar */}
                  {attRate !== null && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-500">Today&apos;s attendance</span>
                        <span className={cn('text-[10px] font-bold', attRate >= 85 ? 'text-emerald-600' : attRate >= 70 ? 'text-amber-600' : 'text-rose-600')}>{attRate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn('h-1.5 rounded-full transition-all duration-700', attColor)} style={{ width: `${attRate}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick actions footer */}
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 flex items-center gap-1.5 flex-wrap">
                  <QuickBtn color="violet" label="Open"
                    onClick={() => navigate(`/my-classes?classroom=${c.id}`)}
                    icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>}
                  />
                  <QuickBtn color="emerald" label="Attendance"
                    onClick={() => navigate(`/my-classes?classroom=${c.id}&tab=attendance`)}
                    icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                  <QuickBtn color="rose" label="Grades"
                    onClick={() => navigate(`/grade-input?classroom=${c.id}`)}
                    icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                  />
                  <QuickBtn color="blue" label="Chat"
                    onClick={() => navigate('/communication-center')}
                    icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
});

MyClassesWidget.displayName = 'MyClassesWidget';
export default MyClassesWidget;
