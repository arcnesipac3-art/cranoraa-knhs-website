import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const GRADE_COLORS = ['#7c3aed', '#6d28d9', '#8b5cf6', '#a78bfa', '#c4b5fd'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 px-3 py-2 text-xs">
      <p className="font-bold text-slate-900 mb-1">{label}</p>
      {payload.map((e, i) => (
        <p key={i} className="text-slate-600 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          {e.name}: <span className="font-bold">{e.value}{typeof e.value === 'number' && e.name !== 'Students' ? '%' : ''}</span>
        </p>
      ))}
    </div>
  );
};

const AnalyticsSnapshot = memo(({ data = {} }) => {
  const navigate = useNavigate();

  // Build weekly attendance from real data if available, fallback to placeholder
  const weeklyData = useMemo(() => {
    const raw = data?.weekly_attendance;
    if (raw && Array.isArray(raw) && raw.length >= 5) {
      return raw.slice(0, 5).map((v, i) => ({ day: WEEK_DAYS[i], attendance: v }));
    }
    // Deterministic placeholder (no random)
    return [
      { day: 'Mon', attendance: data?.attendance_rate ?? 88 },
      { day: 'Tue', attendance: Math.max(0, (data?.attendance_rate ?? 88) - 3) },
      { day: 'Wed', attendance: Math.min(100, (data?.attendance_rate ?? 88) + 4) },
      { day: 'Thu', attendance: Math.max(0, (data?.attendance_rate ?? 88) - 2) },
      { day: 'Fri', attendance: data?.attendance_rate ?? 88 },
    ];
  }, [data]);

  const gradeData = useMemo(() => {
    if (data?.grade_distribution) return data.grade_distribution;
    const total = data?.total_students || 40;
    return [
      { name: '90–100', count: Math.round(total * 0.15) },
      { name: '80–89',  count: Math.round(total * 0.30) },
      { name: '75–79',  count: Math.round(total * 0.28) },
      { name: '70–74',  count: Math.round(total * 0.15) },
      { name: 'Below',  count: Math.round(total * 0.12) },
    ];
  }, [data]);

  const avgAtt = weeklyData.length > 0
    ? Math.round(weeklyData.reduce((s, d) => s + d.attendance, 0) / weeklyData.length)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Analytics Snapshot</h3>
            <p className="text-[10px] text-slate-500 font-medium">This week</p>
          </div>
        </div>
        <button onClick={() => navigate('/my-classes?view=analytics')}
          className="text-[11px] font-bold text-violet-600 hover:text-violet-700 uppercase tracking-wide transition-colors">
          Details
        </button>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Attendance trend */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Attendance Trend</p>
            <span className="text-[11px] font-extrabold text-violet-700">{avgAtt}% avg</span>
          </div>
          <div className="h-[90px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[50, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="attendance" name="Attendance" stroke="#7c3aed" fill="url(#attGrad)" strokeWidth={2} dot={{ r: 3, fill: '#7c3aed' }} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grade distribution */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Grade Distribution</p>
            <span className="text-[11px] font-extrabold text-slate-700">{data?.total_students || 0} students</span>
          </div>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Students" radius={[3, 3, 0, 0]}>
                  {gradeData.map((_, i) => (
                    <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
});

AnalyticsSnapshot.displayName = 'AnalyticsSnapshot';
export default AnalyticsSnapshot;
