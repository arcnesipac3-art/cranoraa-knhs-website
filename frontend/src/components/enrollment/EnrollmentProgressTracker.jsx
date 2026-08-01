import { cn } from '../../styles/designSystem';

/**
 * 5-stage enrollment progress tracker.
 *
 * Stages:
 *   1. Submitted    - application received
 *   2. Under Review - staff reviewing
 *   3. Approved     - application approved
 *   4. Enrolled     - student enrolled
 *
 * Terminal negative states: rejected, cancelled, withdrawn
 *
 * Props:
 *   status   - current enrollment status string
 *   history  - optional array of status_history entries
 *   className
 */
const STAGES = [
  { key: 'submitted',    label: 'Submitted',    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'under_review', label: 'Under Review', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { key: 'approved',     label: 'Approved',     icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'enrolled',     label: 'Enrolled',     icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
];

const getStageIndex = (status) => {
  switch (status) {
    case 'pending': return 0;
    case 'under_review':
    case 'pending_requirements': return 1;
    case 'approved': return 2;
    case 'enrolled': return 3;
    default: return -1; // rejected, cancelled, etc.
  }
};

const EnrollmentProgressTracker = ({ status, history, className }) => {
  const currentIdx = getStageIndex(status);
  const isTerminal = ['rejected', 'cancelled', 'withdrawn'].includes(status);

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center w-full">
        {STAGES.map((stage, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const upcoming = i > currentIdx;

          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0',
                  done && !isTerminal && 'bg-emerald-500 border-emerald-500 text-white',
                  active && !isTerminal && 'bg-violet-600 border-violet-600 text-white ring-4 ring-violet-200',
                  upcoming && 'bg-white border-slate-300 text-slate-400',
                  isTerminal && status === 'rejected' && i <= currentIdx && 'bg-rose-100 border-rose-400 text-rose-600',
                  isTerminal && status === 'cancelled' && i <= currentIdx && 'bg-gray-100 border-gray-400 text-gray-500',
                )}>
                  {done && !isTerminal ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stage.icon} />
                    </svg>
                  )}
                </div>
                <span className={cn(
                  'text-[9px] font-bold uppercase tracking-wide text-center',
                  done && !isTerminal && 'text-emerald-700',
                  active && !isTerminal && 'text-violet-700',
                  upcoming && 'text-slate-400',
                  isTerminal && 'text-slate-400',
                )}>{stage.label}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all',
                  i < currentIdx && !isTerminal && 'bg-emerald-400',
                  i === currentIdx && !isTerminal && 'bg-gradient-to-r from-violet-400 to-slate-200',
                  i > currentIdx && 'bg-slate-200',
                  isTerminal && status === 'rejected' && i <= currentIdx && 'bg-rose-300',
                  isTerminal && status === 'cancelled' && i <= currentIdx && 'bg-gray-300',
                  isTerminal && i > currentIdx && 'bg-slate-200',
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="sm:hidden space-y-0">
        {STAGES.map((stage, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const upcoming = i > currentIdx;
          return (
            <div key={stage.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                  done && !isTerminal && 'bg-emerald-500 border-emerald-500 text-white',
                  active && !isTerminal && 'bg-violet-600 border-violet-600 text-white',
                  upcoming && 'bg-white border-slate-300 text-slate-400',
                  isTerminal && 'bg-white border-slate-300 text-slate-400',
                )}>
                  {done && !isTerminal ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stage.icon} />
                    </svg>
                  )}
                </div>
                {i < STAGES.length - 1 && (
                  <div className={cn(
                    'w-0.5 h-5',
                    i < currentIdx && !isTerminal && 'bg-emerald-400',
                    i >= currentIdx && 'bg-slate-200',
                  )} />
                )}
              </div>
              <div className="pt-1 pb-1">
                <p className={cn(
                  'text-xs font-bold',
                  done && !isTerminal && 'text-emerald-700',
                  active && !isTerminal && 'text-violet-700',
                  upcoming && 'text-slate-400',
                )}>{stage.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal state banner */}
      {isTerminal && (
        <div className={cn(
          'mt-3 px-3 py-2 rounded-lg text-xs font-bold text-center',
          status === 'rejected' && 'bg-rose-50 text-rose-700 border border-rose-200',
          status === 'cancelled' && 'bg-gray-50 text-gray-600 border border-gray-200',
          status === 'withdrawn' && 'bg-amber-50 text-amber-700 border border-amber-200',
        )}>
          Application {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      )}
    </div>
  );
};

export { EnrollmentProgressTracker };
export default EnrollmentProgressTracker;
