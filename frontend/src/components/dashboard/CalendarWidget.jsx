import { memo, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../styles/designSystem';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

const CalendarWidget = memo(() => {
  const navigate = useNavigate();
  const [currentDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());

  const today = currentDate.getDate();
  const todayMonth = currentDate.getMonth();
  const todayYear = currentDate.getFullYear();

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1);

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, currentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = i === today && viewMonth === todayMonth && viewYear === todayYear;
      days.push({ day: i, currentMonth: true, isToday });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false });
    }
    return days;
  }, [daysInMonth, firstDay, prevMonthDays, today, viewMonth, viewYear, todayMonth, todayYear]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Calendar</h3>
            <p className="text-[10px] text-slate-500 font-medium">School events</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/portal-calendar')}
          className="text-[11px] font-bold text-violet-600 hover:text-violet-700 uppercase tracking-wide transition-colors"
        >
          Full View
        </button>
      </div>

      <div className="px-4 md:px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={goToPrevMonth} className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h4 className="text-sm font-extrabold text-slate-900">
            {MONTHS[viewMonth]} {viewYear}
          </h4>
          <button onClick={goToNextMonth} className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">
              {d}
            </div>
          ))}
          {calendarDays.map((d, i) => (
            <div
              key={i}
              className={cn(
                'aspect-square flex items-center justify-center text-xs font-medium rounded-md transition-colors',
                !d.currentMonth && 'text-slate-300',
                d.currentMonth && !d.isToday && 'text-slate-700 hover:bg-violet-50',
                d.isToday && 'bg-violet-600 text-white font-bold shadow-sm'
              )}
            >
              {d.day}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

CalendarWidget.displayName = 'CalendarWidget';
export default CalendarWidget;
