import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useActiveAcademicYear } from '../../hooks/useActiveAcademicYear';
import api from '../../utils/api';

const GREETINGS = { morning: 'Good Morning', afternoon: 'Good Afternoon', evening: 'Good Evening' };
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS.morning;
  if (h < 18) return GREETINGS.afternoon;
  return GREETINGS.evening;
}

const WelcomeBanner = memo(({ user, classrooms = [], data }) => {
  const { academicYear } = useActiveAcademicYear();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sysSettings, setSysSettings] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.get('/system/settings/').then(r => setSysSettings(r.data)).catch(() => {});
  }, []);

  const greeting = getGreeting();
  const totalStudents = data?.total_students || 0;
  const advisoryClass = classrooms.find(c => c.is_adviser || c.adviser === user?.id);
  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const currentTerm = sysSettings?.current_term || null;
  const displayName = user?.first_name || 'Teacher';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-violet-200/60 shadow-lg shadow-violet-200/30"
      style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 40%, #6d28d9 70%, #7c3aed 100%)' }}
    >
      {/* background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-purple-300/10 rounded-full blur-2xl" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-violet-300/5 rounded-full blur-xl" />
      </div>

      <div className="relative px-5 py-5 md:px-7 md:py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

          {/* Left: identity + greeting */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner shrink-0 overflow-hidden">
              {user?.profile_picture
                ? <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
                : <span className="text-xl font-extrabold text-white">{user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}</span>
              }
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-none">
                  {greeting}, {displayName}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-200 bg-white/10 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {user?.department || 'Teacher'}
                </span>
                {currentTerm && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-200 bg-white/10 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>
                    {currentTerm}
                  </span>
                )}
                {academicYear && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-200 bg-white/10 px-2 py-0.5 rounded-full">
                    SY {academicYear}
                  </span>
                )}
              </div>
              <p className="text-xs text-violet-300 font-medium mt-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {formattedDate} &middot; {formattedTime}
              </p>
            </div>
          </div>

          {/* Right: stat pills */}
          <div className="flex flex-wrap items-center gap-2.5 lg:flex-shrink-0">
            {/* Classes */}
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/15 min-w-[90px]">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <div>
                <p className="text-lg font-extrabold text-white leading-none">{classrooms.length}</p>
                <p className="text-[10px] text-violet-200 font-semibold mt-0.5">Classes</p>
              </div>
            </div>
            {/* Students */}
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/15 min-w-[90px]">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <div>
                <p className="text-lg font-extrabold text-white leading-none">{totalStudents}</p>
                <p className="text-[10px] text-violet-200 font-semibold mt-0.5">Students</p>
              </div>
            </div>
            {/* Advisory */}
            {advisoryClass && (
              <div className="flex items-center gap-2.5 bg-emerald-500/20 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-emerald-400/30 min-w-[90px]">
                <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-white leading-none truncate max-w-[80px]">{advisoryClass.name}</p>
                  <p className="text-[10px] text-emerald-200 font-semibold mt-0.5">Advisory</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

WelcomeBanner.displayName = 'WelcomeBanner';
export default WelcomeBanner;
