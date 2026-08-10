import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '../../styles/designSystem';

/**
 * LineChart Component using Recharts
 * 
 * Features:
 * - Responsive container
 * - Configurable axes and legend
 * - Hover tooltips with data details
 * - Multiple line series support
 * - Custom colors
 * - Empty state handling
 * 
 * @param {Object} props
 * @param {Array} props.data - Chart data array
 * @param {Array} props.lines - Line configurations [{ dataKey, name, color }]
 * @param {string} props.xAxisKey - Key for X-axis data
 * @param {string} props.xAxisLabel - X-axis label
 * @param {string} props.yAxisLabel - Y-axis label
 * @param {boolean} props.showLegend - Show/hide legend
 * @param {boolean} props.showGrid - Show/hide grid lines
 * @param {number} props.height - Chart height in pixels
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.formatYAxis - Custom Y-axis formatter
 * @param {Function} props.formatTooltip - Custom tooltip formatter
 * @param {React.ReactNode} props.emptyState - Custom empty state
 * @returns {JSX.Element}
 */
export const LineChartComponent = ({
  data = [],
  lines = [],
  xAxisKey = 'name',
  xAxisLabel = '',
  yAxisLabel = '',
  showLegend = true,
  showGrid = true,
  height = 300,
  className = '',
  formatYAxis,
  formatTooltip,
  emptyState,
}) => {
  // Empty state
  if (!data || data.length === 0) {
    return (
      emptyState || (
        <div
          className={cn(
            'flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-slate-50',
            className
          )}
          style={{ height }}
        >
          <div className="text-center p-8">
            <svg
              className="w-12 h-12 mx-auto text-slate-400 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm font-medium text-slate-600">No data available</p>
            <p className="text-xs text-slate-500 mt-1">Chart will appear when data is loaded</p>
          </div>
        </div>
      )
    );
  }

  // Default line colors
  const defaultColors = [
    '#7c3aed', // violet-600
    '#3b82f6', // blue-600
    '#10b981', // green-600
    '#f59e0b', // amber-600
    '#ef4444', // red-600
    '#8b5cf6', // purple-600
    '#06b6d4', // cyan-600
    '#f97316', // orange-600
  ];

  const linesWithColors = lines.map((line, index) => ({
    ...line,
    color: line.color || defaultColors[index % defaultColors.length],
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-slate-200 rounded-lg shadow-lg p-3"
      >
        <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600">{entry.name}:</span>
            <span className="font-medium text-slate-900">
              {formatTooltip ? formatTooltip(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </motion.div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          )}
          
          <XAxis
            dataKey={xAxisKey}
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 12 }}
            label={xAxisLabel ? {
              value: xAxisLabel,
              position: 'insideBottom',
              offset: -5,
              style: { fill: '#475569', fontSize: 12, fontWeight: 600 }
            } : undefined}
          />
          
          <YAxis
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={formatYAxis}
            label={yAxisLabel ? {
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#475569', fontSize: 12, fontWeight: 600 }
            } : undefined}
          />
          
          <Tooltip content={CustomTooltip} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
          
          {showLegend && (
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '12px',
                fontWeight: 600,
              }}
              iconType="line"
            />
          )}
          
          {linesWithColors.map((line, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6 }}
              animationDuration={1000}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;
