import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { useActiveAcademicYear } from '../../hooks/useActiveAcademicYear';
import {
  Card, CardHeader, CardBody, CardTitle, Badge, EmptyState
} from '../../components/ui';

import { Skeleton } from '../../components/ui';

const STATUS_CONFIG = {
  present: { label: 'Present', short: 'P', color: 'emerald', buttonClass: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700' },
  absent:  { label: 'Absent',  short: 'A', color: 'red',     buttonClass: 'bg-red-600 text-white hover:bg-red-700 border-red-700' },
  late:    { label: 'Late',    short: 'L', color: 'amber',   buttonClass: 'bg-amber-600 text-white hover:bg-amber-700 border-amber-700' },
  excused: { label: 'Excused', short: 'E', color: 'violet',  buttonClass: 'bg-violet-600 text-white hover:bg-violet-700 border-violet-700' },
};

const StudentAttendance = () => {
  const { academicYear } = useActiveAcademicYear();
  const [myAttendance, setMyAttendance] = useState([]);
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!academicYear) return;
    setLoading(true);
    api.get(`/attendance/my_attendance/?academic_year=${academicYear}`)
      .then(r => setMyAttendance(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [academicYear]);

  const filteredMyAttendance = myAttendance.filter(r => {
    const isDateMatch = r.date?.startsWith(filterMonth);
    const day = new Date(r.date + 'T00:00:00').getDay();
    return isDateMatch && !(day === 0 || day === 6);
  });

  const myStats = filteredMyAttendance.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const total = filteredMyAttendance.length;
  const attRate = total > 0 ? Math.round(((myStats.present || 0) + (myStats.late || 0)) / total * 100) : null;

  const subjectAttendance = {};
  filteredMyAttendance.forEach(r => {
    const key = r.subject_name || r.classroom_name || 'Unknown';
    if (!subjectAttendance[key]) subjectAttendance[key] = { present: 0, late: 0, absent: 0, excused: 0, total: 0 };
    subjectAttendance[key][r.status] = (subjectAttendance[key][r.status] || 0) + 1;
    subjectAttendance[key].total++;
  });

  if (loading) {
    return (
      <div className="page-bottom-safe max-w-[1600px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-4">
        <Skeleton className="h-8 w-48 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.AttendanceCard key={i} />)}
        </div>
        <Skeleton.Table rows={5} cols={4} hasAvatar />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="page-bottom-safe max-w-[1600px] mx-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>Attendance Record</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">My Attendance</h1>
          <p className="text-xs text-slate-600 mt-1 font-semibold">View your attendance record by month</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Month:</label>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all text-sm font-semibold shadow-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {Object.keys(STATUS_CONFIG).map(key => {
          const cfg = STATUS_CONFIG[key];
          return (
            <Card key={key} className={`border-l-4 border-l-${cfg.color}-500`}>
              <CardBody className="p-4 text-center">
                <div className={`text-3xl font-extrabold text-${cfg.color}-600 mb-1`}>{myStats[key] || 0}</div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">{cfg.label}</div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {attRate !== null && (
        <Card>
          <CardBody className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Monthly Attendance Rate</span>
              <span className={`text-lg font-extrabold ${attRate >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>{attRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${attRate >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${attRate}%` }} />
            </div>
            {attRate < 75 && <p className="text-xs text-red-600 mt-2 font-bold uppercase tracking-wide">Attendance below 75% threshold</p>}
          </CardBody>
        </Card>
      )}

      {Object.keys(subjectAttendance).length > 0 && (
        <Card>
          <CardHeader divider>
            <CardTitle subtitle="Breakdown by subject">By Subject</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider hidden sm:table-cell">Present</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider hidden md:table-cell">Late</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider hidden md:table-cell">Absent</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider">Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {Object.entries(subjectAttendance).map(([subject, data]) => {
                    const rate = data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 0;
                    return (
                      <tr key={subject} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 truncate max-w-[120px] md:max-w-none">{subject}</td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-emerald-600 hidden sm:table-cell">{data.present || 0}</td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-amber-600 hidden md:table-cell">{data.late || 0}</td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-red-600 hidden md:table-cell">{data.absent || 0}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={rate >= 75 ? 'green' : 'red'}>{rate}%</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader divider>
          <CardTitle subtitle={`${total} records for ${new Date(filterMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}>
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {filteredMyAttendance.length === 0 ? (
            <div className="p-12">
              <EmptyState title="No Records Found" description="No attendance records for the selected month"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider hidden md:table-cell">Day</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider hidden lg:table-cell">Classroom</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider hidden md:table-cell">Subject</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider hidden md:table-cell">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredMyAttendance.map((r) => {
                    const cfg = STATUS_CONFIG[r.status];
                    const date = new Date(r.date + 'T00:00:00');
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-bold text-slate-900">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">
                          {date.toLocaleDateString('en-US', { weekday: 'long' })}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-700 hidden lg:table-cell">{r.classroom_name}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-slate-600 hidden md:table-cell">{r.subject_name || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={cfg?.color || 'slate'}>{cfg?.label || r.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">{r.remarks || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
};

export default StudentAttendance;
