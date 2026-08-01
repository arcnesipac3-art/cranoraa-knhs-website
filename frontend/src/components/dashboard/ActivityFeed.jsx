import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../styles/designSystem';

const TYPE_CFG = {
  grade:        { bg: 'bg-violet-100', text: 'text-violet-600', path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  attendance:   { bg: 'bg-emerald-100', text: 'text-emerald-600', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  announcement: { bg: 'bg-amber-100', text: 'text-amber-600', path: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  enrollment:   { bg: 'bg-blue-100', text: 'text-blue-600', path: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
  message:      { bg: 'bg-rose-100', text: 'text-rose-600', path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  system:       { bg: 'bg-slate-100', text: 'text-slate-500', path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
};

const ActivityFeed = memo(({ activities = [] }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Activity Feed</h3>
            <p className="text-[10px] text-slate-500 font-medium">Recent actions</p>
          </div>
        </div>
        {activities.length > 0 && (
          <span className="text-[10px] font-bold text-slate-400">{activities.length} events</span>
        )}
      </div>

      <div className="px-5 py-4">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs font-bold text-slate-500">No recent activity</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Actions you take will appear here</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-100" />
            <div className="space-y-3">
              {activities.slice(0, 8).map((activity, idx) => {
                const icon = TYPE_CFG[activity.type] || TYPE_CFG.system;
                return (
                  <motion.div key={idx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.25 }}
                    className="flex items-start gap-3 relative"
                  >
                    <div className={cn(
                      'w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 relative z-10 border-2 border-white shadow-sm',
                      icon.bg, icon.text
                    )}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5 pb-1">
                      <p className="text-xs text-slate-700 leading-relaxed">{activity.message}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{activity.time}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ActivityFeed.displayName = 'ActivityFeed';
export default ActivityFeed;
