import { memo, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { Skeleton } from '../ui';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 px-3 py-2 text-xs">
      <p className="font-bold text-slate-900 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-slate-600">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.name}: {entry.value}
          {entry.dataKey === 'attendance' ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

const AnalyticsSnapshot = memo(({ classroomIds = [] }) => {
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState([]);
  const [gradeData, setGradeData] = useState([]);
  const [loading, setLoading] = useState(true);

  const classroomKey = useMemo(() => classroomIds.join(','), [classroomIds]);

  useEffect(() => {
    let cancelled = false;
    const firstClassroom = classroomKey.split(',').filter(Boolean)[0] || null;

    const load = async () => {
      setLoading(true);
      try {
        const classroomParam = firstClassroom ? `&classroom=${firstClassroom}` : '';
        const [attRes, gradeRes] = await Promise.all([
          api.get(`/attendance/summary/?timeframe=weekly${classroomParam}`).catch(() => ({ data: null })),
          firstClassroom
            ? api.get(`/grades/summary/?classroom=${firstClassroom}`).catch(() => ({ data: null }))
            : Promise.resolve({ data: null }),
        ]);

        if (cancelled) return;

        if (attRes?.data?.daily_trends?.length) {
          const trends = attRes.data.daily_trends.slice(-5).map(t => {
            let label = '—';
            if (t.date) {
              const d = new Date(`${t.date}T00:00:00`);
              if (!isNaN(d)) label = d.toLocaleDateString('en-US', { weekday: 'short' });
            }
            return { day: label, attendance: Math.round(t.rate ?? 0) };
          });
          setAttendanceData(trends);
        } else {
          setAttendanceData([]);
        }

        if (gradeRes?.data?.distribution) {
          const d = gradeRes.data.distribution;
          setGradeData([
            { name: '90+', count: d.outstanding ?? 0 },
            { name: '85-89', count: d.very_satisfactory ?? 0 },
            { name: '80-84', count: d.satisfactory ?? 0 },
            { name: '75-79', count: d.fairly_satisfactory ?? 0 },
            { name: '<75', count: d.failed ?? 0 },
          ]);
        } else {
          setGradeData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [classroomKey]);

  const hasAttendance = attendanceData.length > 0;
  const hasGrades = gradeData.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Analytics Snapshot</h3>
            <p className="text-[10px] text-slate-500 font-medium">Weekly trends</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/my-classes?view=analytics')}
          className="text-[11px] font-bold text-violet-600 hover:text-violet-700 uppercase tracking-wide transition-colors"
        >
          Details
        </button>
      </div>

      <div className="px-4 md:px-5 py-3">
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Attendance Trend</p>
          {loading ? (
            <div className="h-[100px] flex items-end justify-center">
              <Skeleton className="w-full h-[80px] rounded" />
            </div>
          ) : hasAttendance ? (
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[60, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="attendance" stroke="#7c3aed" fill="url(#attGrad)" strokeWidth={2} dot={false} name="Attendance" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[100px] flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200">
              <svg className="w-6 h-6 text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-[11px] text-slate-400 font-medium">No attendance data yet</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Grade Distribution</p>
          {loading ? (
            <div className="h-[80px] flex items-end justify-center">
              <Skeleton className="w-full h-[64px] rounded" />
            </div>
          ) : hasGrades ? (
            <div className="h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[80px] flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200">
              <svg className="w-6 h-6 text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-[11px] text-slate-400 font-medium">No grade data yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AnalyticsSnapshot.displayName = 'AnalyticsSnapshot';
export default AnalyticsSnapshot;
