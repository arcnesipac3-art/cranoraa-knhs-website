import { memo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const GradeRadarChart = memo(({ data, title, height = 200 }) => {
  if (!data || data.length === 0) return null;

  const chartData = data.map(d => ({
    subject: d.subject?.length > 10 ? d.subject.slice(0, 10) + '…' : d.subject,
    score: d.score ?? 0,
    fullName: d.subject,
  }));

  return (
    <div className="w-full">
      {title && (
        <p className="text-[10px] font-bold text-slate-500 tracking-[0.1em] mb-2">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 8, fill: '#94a3b8' }}
            tickCount={5}
          />
          <Radar
            name="Grade"
            dataKey="score"
            stroke="#7c3aed"
            fill="#7c3aed"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value) => [value, 'Grade']}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
});

GradeRadarChart.displayName = 'GradeRadarChart';

export default GradeRadarChart;
