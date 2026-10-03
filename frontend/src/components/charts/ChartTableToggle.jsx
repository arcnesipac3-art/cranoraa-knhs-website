import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../styles/designSystem';

/**
 * ChartTableToggle Component
 * 
 * Provides toggle functionality between chart and table views with localStorage persistence.
 * 
 * Features:
 * - Toggle between chart and table views
 * - Persistent user preference (localStorage)
 * - Screen reader accessible
 * - Smooth transitions
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.chartView - Chart component/element
 * @param {Array} props.data - Data array for table
 * @param {Array} props.columns - Table columns [{ key, label, render }]
 * @param {string} props.storageKey - localStorage key for persistence
 * @param {string} props.defaultView - Default view ('chart' or 'table')
 * @param {string} props.title - Optional title
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export const ChartTableToggle = ({
  chartView,
  data = [],
  columns = [],
  storageKey = 'chart-table-view',
  defaultView = 'chart',
  title,
  className = '',
}) => {
  // Load view preference from localStorage
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      return stored || defaultView;
    }
    return defaultView;
  });

  // Persist view preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, currentView);
    }
  }, [currentView, storageKey]);

  const toggleView = (view) => {
    setCurrentView(view);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-4">
        {title && (
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        )}

        <div
          className="inline-flex rounded-lg border border-slate-200 p-1 bg-white"
          role="group"
          aria-label="View toggle"
        >
          <button
            onClick={() => toggleView('chart')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2',
              'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2',
              currentView === 'chart'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            )}
            aria-pressed={currentView === 'chart'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="hidden sm:inline">Chart</span>
          </button>

          <button
            onClick={() => toggleView('table')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2',
              'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2',
              currentView === 'table'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            )}
            aria-pressed={currentView === 'table'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* View content */}
      <AnimatePresence mode="wait">
        {currentView === 'chart' ? (
          <motion.div
            key="chart"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {chartView}
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <DataTable data={data} columns={columns} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * DataTable Component
 * Accessible table view for chart data
 */
const DataTable = ({ data, columns }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-300 rounded-lg bg-slate-50">
        <p className="text-sm font-medium text-slate-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="min-w-full divide-y divide-slate-200 bg-white">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="hover:bg-slate-50 transition-colors"
            >
              {columns.map((col, colIndex) => (
                <td
                  key={colIndex}
                  className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap"
                >
                  {col.render ? col.render(row, rowIndex) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ChartTableToggle;
