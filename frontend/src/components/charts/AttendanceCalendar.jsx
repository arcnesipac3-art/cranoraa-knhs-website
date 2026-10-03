import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../styles/designSystem';

/**
 * AttendanceCalendar Heatmap Component
 * 
 * Features:
 * - Month grid calendar with day cells
 * - Color-coded attendance status
 * - Click handler for day details
 * - Month/year navigation
 * - Responsive sizing
 * - Color-blind friendly with patterns
 * 
 * @param {Object} props
 * @param {Array} props.attendanceData - Attendance records [{ date, status }]
 * @param {Function} props.onDayClick - Day click handler (date, status)
 * @param {number} props.year - Current year
 * @param {number} props.month - Current month (0-11)
 * @param {Function} props.onMonthChange - Month change handler (year, month)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export const AttendanceCalendar = ({
  attendanceData = [],
  onDayClick,
  year: initialYear = new Date().getFullYear(),
  month: initialMonth = new Date().getMonth(),
  onMonthChange,
  className = '',
}) => {
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  // Attendance status colors (color-blind friendly)
  const statusConfig = {
    present: {
      color: 'bg-green-500',
      textColor: 'text-green-900',
      borderColor: 'border-green-600',
      label: 'Present',
      icon: '✓',
    },
    absent: {
      color: 'bg-red-500',
      textColor: 'text-red-900',
      borderColor: 'border-red-600',
      label: 'Absent',
      icon: '✗',
    },
    late: {
      color: 'bg-amber-500',
      textColor: 'text-amber-900',
      borderColor: 'border-amber-600',
      label: 'Late',
      icon: '⚠',
    },
    excused: {
      color: 'bg-blue-500',
      textColor: 'text-blue-900',
      borderColor: 'border-blue-600',
      label: 'Excused',
      icon: 'E',
    },
    holiday: {
      color: 'bg-purple-500',
      textColor: 'text-purple-900',
      borderColor: 'border-purple-600',
      label: 'Holiday',
      icon: '★',
    },
  };

  // Get month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, date: null, status: null });
    }

    // Add month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateString = date.toISOString().split('T')[0];
      
      // Find attendance record for this date
      const record = attendanceData.find(a => {
        const recordDate = new Date(a.date).toISOString().split('T')[0];
        return recordDate === dateString;
      });

      days.push({
        day,
        date,
        dateString,
        status: record?.status || null,
      });
    }

    return days;
  }, [currentYear, currentMonth, attendanceData]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    onMonthChange?.(newYear, newMonth);
  };

  const goToNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    onMonthChange?.(newYear, newMonth);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    onMonthChange?.(today.getFullYear(), today.getMonth());
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDayClick = (dayData) => {
    if (dayData.day && onDayClick) {
      onDayClick(dayData.date, dayData.status);
    }
  };

  return (
    <div className={cn('w-full bg-white rounded-lg border border-slate-200 p-4', className)}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          {monthNames[currentMonth]} {currentYear}
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            Today
          </button>
          <button
            onClick={goToPreviousMonth}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-slate-600"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        <AnimatePresence mode="wait">
          {calendarDays.map((dayData, index) => {
            const config = dayData.status ? statusConfig[dayData.status] : null;
            const today = isToday(dayData.date);

            return (
              <motion.div
                key={`${currentYear}-${currentMonth}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: index * 0.01 }}
                className="aspect-square"
              >
                {dayData.day ? (
                  <button
                    onClick={() => handleDayClick(dayData)}
                    className={cn(
                      'w-full h-full rounded-lg border transition-all relative',
                      'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2',
                      config
                        ? `${config.color} ${config.borderColor} text-white hover:opacity-90`
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300',
                      today && !config && 'border-violet-600 bg-violet-50',
                      onDayClick && 'cursor-pointer'
                    )}
                    aria-label={`${monthNames[currentMonth]} ${dayData.day}, ${currentYear}${config ? `, ${config.label}` : ''}`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className={cn(
                        'text-sm font-semibold',
                        config ? 'text-white' : today ? 'text-violet-700' : 'text-slate-700'
                      )}>
                        {dayData.day}
                      </span>
                      {config && (
                        <span className="text-xs mt-0.5" aria-hidden="true">
                          {config.icon}
                        </span>
                      )}
                    </div>
                  </button>
                ) : (
                  <div className="w-full h-full" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-600 mb-3">Legend</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(statusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center',
                  config.color,
                  config.borderColor
                )}
              >
                <span className="text-[10px] text-white" aria-hidden="true">
                  {config.icon}
                </span>
              </div>
              <span className="text-xs text-slate-700">{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
