import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useActiveAcademicYear } from '../hooks/useActiveAcademicYear';
import { useSystemSettings } from '../hooks/useSystemSettings';
import {
  Card, CardHeader, CardBody, CardTitle, Button, Badge, Skeleton, EmptyState,
} from '../components/ui';
import {
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip,
  AreaChart, Area, CartesianGrid, XAxis, YAxis,
  BarChart, Bar,
} from 'recharts';
import {
  BarChart3, Users, TrendingUp, Clock, Download,
  ChevronLeft, ChevronRight, Zap, BookOpen, AlertTriangle,
  CheckCircle, XCircle, Eye, FileText, GraduationCap, Award,
  PieChart as PieChartIcon,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#06b6d4', '#ec4899'];
const BAR_COLOR = '#6366f1';

const gradeColor = (rate) => {
  if (rate >= 90) return '#10b981';
  if (rate >= 85) return '#3b82f6';
  if (rate >= 75) return '#f59e0b';
  return '#ef4444';
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// ── PDF Export ─────────────────────────────────────────────────────────────

const exportToPDF = async (ref, filename, title, subtitle) => {
  if (!ref.current) return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'), import('jspdf'),
  ]);
  try {
    const el = ref.current;
    const prevBg = el.style.background;
    el.style.background = '#ffffff';

    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
      logging: false, windowWidth: 1200,
      onclone: (doc) => {
        doc.querySelectorAll('button, select').forEach(n => n.style.display = 'none');
        doc.querySelectorAll('[data-pdf-bg]').forEach(n => {
          n.style.background = '#ffffff';
          n.style.color = '#1e293b';
        });
      },
    });

    el.style.background = prevBg;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, M = 15, CW = W - M * 2;

    pdf.setFillColor(99, 102, 241);
    pdf.rect(0, 0, 210, 35, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('KNHS PRISM Portal', M, 14);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(title, M, 21);
    pdf.setFontSize(8);
    pdf.text(subtitle, M, 27);
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, M, 32);

    const imgData = canvas.toDataURL('image/png');
    const imgW = CW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let y = 40;

    if (y + imgH <= 297 - M) {
      pdf.addImage(imgData, 'PNG', M, y, imgW, imgH);
    } else {
      const pageH = 297 - M - 40;
      let srcY = 0;
      while (srcY < canvas.height) {
        const sliceH = Math.min(pageH * (canvas.width / imgW), canvas.height - srcY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        sliceCanvas.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', M, y, imgW, sliceH * (imgW / canvas.width));
        srcY += sliceH;
        y += sliceH * (imgW / canvas.width);
        if (srcY < canvas.height) pdf.addPage();
      }
    }

    const pages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7);
      pdf.setTextColor(150);
      pdf.text(`KNHS PRISM Portal — Page ${i} of ${pages}`, M, 290);
      pdf.text('Confidential — For Internal Use Only', W - M - 50, 290, { align: 'right' });
    }

    pdf.save(filename);
  } catch (err) {
    console.error('PDF export failed:', err);
  }
};

// ── Shared Components ──────────────────────────────────────────────────────

const ChartTooltip = ({ active, label, unit = '' }) => {
  if (!active) return null;
  const payload = active?.payload;
  if (!payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-slate-600 mb-1.5 text-xs">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-bold text-slate-800">{entry.value}{unit}</span>
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 text-sm">
      <p className="flex items-center gap-2 text-xs">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.payload?.fill }} />
        <span className="font-bold text-slate-800">{item.value}</span>
        <span className="text-slate-500">{item.name}</span>
      </p>
    </div>
  );
};

const SectionCard = ({ children, className = '' }) => (
  <motion.div variants={staggerItem}>
    <Card className={className}>
      {children}
    </Card>
  </motion.div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <CardHeader divider>
    <div className="flex items-center justify-between">
      <CardTitle subtitle={subtitle}>{title}</CardTitle>
      {action}
    </div>
  </CardHeader>
);

const StatCard = ({ label, value, icon: Icon, color = 'violet', trend }) => {
  const colorMap = {
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    red: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100' },
  };
  const c = colorMap[color] || colorMap.violet;
  return (
    <motion.div variants={staggerItem}>
      <Card className="hover:shadow-md transition-shadow">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${c.text}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="text-xl font-extrabold text-slate-900 truncate">{value ?? '—'}</p>
              {trend && (
                <p className={`text-[10px] font-bold ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
                </p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

const FilterDropdown = ({ label, value, onChange, options }) => (
  <div className="relative">
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
    <select value={value} onChange={onChange}
      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all appearance-none pr-8 cursor-pointer">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <div className="absolute right-2.5 bottom-2.5 pointer-events-none text-slate-400">
      <ChevronRight className="w-3.5 h-3.5 rotate-90" />
    </div>
  </div>
);

const YearSelector = ({ year, onChange }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Academic Year</label>
    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-9 bg-white">
      <button onClick={() => onChange('prev')} className="px-2.5 h-full hover:bg-slate-50 text-slate-400 border-r border-slate-200 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="flex-1 text-center text-sm font-bold text-slate-700 select-none">{year}</span>
      <button onClick={() => onChange('next')} className="px-2.5 h-full hover:bg-slate-50 text-slate-400 border-l border-slate-200 transition-colors">
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

// ── Insights Panel ─────────────────────────────────────────────────────────

const InsightsPanel = ({ items }) => {
  if (!items?.length) return null;
  const iconMap = { good: CheckCircle, warn: AlertTriangle, bad: XCircle, info: Eye };
  const colorMap = {
    good: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
    warn: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
    bad: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'text-rose-500' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
  };
  return (
    <SectionCard>
      <SectionHeader
        title="Key Insights"
        subtitle="Automated analysis of current data"
        action={<Badge variant="info" dot>{items.length} findings</Badge>}
      />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map((item, i) => {
            const c = colorMap[item.type] || colorMap.info;
            const Icon = iconMap[item.type] || Eye;
            return (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border ${c.bg} ${c.border}`}>
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.icon}`} />
                <p className={`text-sm leading-relaxed ${c.text}`}>{item.text}</p>
              </div>
            );
          })}
        </div>
      </CardBody>
    </SectionCard>
  );
};

// ── Interpretation Helpers ─────────────────────────────────────────────────

const interpretSystem = (data) => {
  if (!data) return [];
  const items = [];
  const d = data.dashboard || {};
  const rate = d.today_rate || 0;
  const avg = d.average_grade || 0;
  const pending = d.pending_approvals || 0;

  if (rate >= 90) items.push({ type: 'good', text: `Attendance rate of ${rate}% today — excellent student engagement.` });
  else if (rate >= 75) items.push({ type: 'warn', text: `Attendance at ${rate}% is acceptable but below the 90% target.` });
  else if (rate > 0) items.push({ type: 'bad', text: `Low attendance at ${rate}% — follow up with class advisers.` });

  if (avg >= 85) items.push({ type: 'good', text: `School average of ${avg}% is Very Satisfactory.` });
  else if (avg >= 75) items.push({ type: 'warn', text: `School average of ${avg}% meets passing but has room for improvement.` });
  else if (avg > 0) items.push({ type: 'bad', text: `School average of ${avg}% is below 75% — intervention needed.` });

  if (pending > 0) items.push({ type: 'warn', text: `${pending} account(s) pending approval.` });
  else items.push({ type: 'good', text: 'All registrations reviewed — no pending approvals.' });

  if (d.active_users > 0) items.push({ type: 'info', text: `${d.active_users} user(s) currently active on the portal.` });

  return items;
};

const interpretGrades = (gradeData, filterLevel, filterSubject, filterQuarter, periodLabel) => {
  if (!gradeData || gradeData.total_students === 0) return [];
  const items = [];
  const avg = gradeData.overall_average || 0;
  const cats = gradeData.category_counts || [];
  const dnm = cats.find(c => c.name.includes('Did Not'))?.value || 0;
  const total = gradeData.total_students || 1;

  const scope = filterLevel !== 'all' ? filterLevel : 'all levels';
  const qLabel = filterQuarter !== 'all' ? `${periodLabel} ${filterQuarter}` : `all ${periodLabel.toLowerCase()}s`;

  if (avg >= 90) items.push({ type: 'good', text: `Outstanding average of ${avg}% across ${scope} for ${qLabel}.` });
  else if (avg >= 85) items.push({ type: 'good', text: `Very Satisfactory average of ${avg}% for ${scope}.` });
  else if (avg >= 75) items.push({ type: 'warn', text: `Average of ${avg}% for ${scope} meets passing — consider targeted support.` });
  else if (avg > 0) items.push({ type: 'bad', text: `Average of ${avg}% for ${scope} is below 75% — immediate intervention recommended.` });

  if (dnm > 0) {
    const dnmPct = Math.round((dnm / total) * 100);
    items.push({ type: dnmPct > 20 ? 'bad' : 'warn', text: `${dnmPct}% of students (${dnm}) did not meet expectations.` });
  } else {
    items.push({ type: 'good', text: 'All students are meeting the minimum passing standard.' });
  }

  const byLevel = gradeData.by_level || [];
  if (byLevel.length > 1) {
    const sorted = [...byLevel].sort((a, b) => b.average - a.average);
    if (sorted[0] && sorted[sorted.length - 1] && sorted[0].label !== sorted[sorted.length - 1].label) {
      items.push({ type: 'info', text: `${sorted[0].label} leads with ${sorted[0].average}%. ${sorted[sorted.length - 1].label} has the lowest at ${sorted[sorted.length - 1].average}%.` });
    }
  }

  return items;
};

const interpretAttendance = (analytics) => {
  if (!analytics) return [];
  const items = [];
  const pie = analytics.pie_data || [];
  const total = pie.reduce((s, d) => s + d.value, 0);
  if (total === 0) return [{ type: 'info', text: 'No attendance records found for this period.' }];

  const present = pie.find(d => d.name === 'Present')?.value || 0;
  const absent = pie.find(d => d.name === 'Absent')?.value || 0;
  const late = pie.find(d => d.name === 'Late')?.value || 0;
  const excused = pie.find(d => d.name === 'Excused')?.value || 0;
  const presentRate = Math.round(((present + late + excused) / total) * 100);

  if (presentRate >= 95) items.push({ type: 'good', text: `Excellent attendance rate of ${presentRate}%.` });
  else if (presentRate >= 85) items.push({ type: 'good', text: `Good attendance rate of ${presentRate}%.` });
  else if (presentRate >= 75) items.push({ type: 'warn', text: `Attendance at ${presentRate}% is at the minimum threshold.` });
  else items.push({ type: 'bad', text: `Low attendance at ${presentRate}% — parent communication advised.` });

  if (absent > 0) {
    const absentRate = Math.round((absent / total) * 100);
    if (absentRate > 15) items.push({ type: 'bad', text: `${absentRate}% absence rate is high — consider home visitation.` });
  }

  const rankings = analytics.section_rankings || [];
  if (rankings.length > 0) {
    const top = rankings[0];
    if (top.total_records > 0) items.push({ type: 'good', text: `Top section: ${top.name} with ${top.rate}% attendance.` });
  }

  return items;
};

// ── Chart Sections ─────────────────────────────────────────────────────────

const AttendanceTrends = ({ data }) => (
  <SectionCard>
    <SectionHeader
      title="Daily Attendance Trends"
      subtitle="30-day presence overview"
      action={
        <div className="flex items-center gap-4 text-[10px] font-semibold">
          <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-emerald-500" />Present</span>
          <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-amber-500" />Late</span>
          <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-indigo-500" />Excused</span>
        </div>
      }
    />
    <CardBody className="p-4 h-[280px] sm:h-[320px]">
      {!data?.length ? (
        <EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No trend data" description="Start encoding attendance to see trends" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              <linearGradient id="gLate" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
              <linearGradient id="gExcused" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
              tickFormatter={str => { if (!str) return ''; const d = new Date(str); return isNaN(d) ? str : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={ChartTooltip} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} fill="url(#gPresent)" name="Present" />
            <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} fill="url(#gLate)" name="Late" />
            <Area type="monotone" dataKey="excused" stroke="#6366f1" strokeWidth={2} fill="url(#gExcused)" name="Excused" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </CardBody>
  </SectionCard>
);

const AttendancePie = ({ data }) => {
  const total = data?.reduce((s, d) => s + d.value, 0) || 0;
  const hasData = data?.some(d => d.value > 0);
  return (
    <SectionCard>
      <SectionHeader title="Status Distribution" subtitle="Overall attendance breakdown" />
      <CardBody className="p-4 h-[280px] sm:h-[320px] flex items-center gap-6">
        {!hasData ? (
          <EmptyState icon={<PieChartIcon className="w-8 h-8" />} title="No status data" />
        ) : (
          <>
            <div className="w-1/2 h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value">
                    {data?.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip content={PieTooltip} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-extrabold text-slate-900">{total}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Records</p>
              </div>
            </div>
            <div className="w-1/2 space-y-2.5">
              {data?.map((item, i) => {
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm text-slate-600">{item.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-slate-800">{pct}%</span>
                      <span className="text-[10px] text-slate-400">({item.value})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardBody>
    </SectionCard>
  );
};

const AttendanceByLevel = ({ data }) => (
  <SectionCard>
    <SectionHeader title="Attendance by Grade Level" subtitle="Rate comparison across levels" />
    <CardBody className="p-4 h-[280px] sm:h-[320px]">
      {!data?.length ? (
        <EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No level data" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={(props) => <ChartTooltip {...props} unit="%" />} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={36}>
              {data.map((entry, i) => <Cell key={i} fill={gradeColor(entry.rate)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardBody>
  </SectionCard>
);

const SectionRankings = ({ rankings, period }) => (
  <SectionCard>
    <SectionHeader title="Section Rankings" subtitle={`Performance — ${period || 'All Time'}`} />
    <CardBody className="p-0 max-h-[320px] overflow-y-auto">
      {!rankings?.length ? (
        <EmptyState icon={<Award className="w-8 h-8" />} title="No rankings" />
      ) : (
        <div className="divide-y divide-slate-100">
          {rankings.map((rank, idx) => (
            <div key={rank.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold ${
                  idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'
                }`}>{idx + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{rank.name}</p>
                  <p className="text-[10px] text-slate-400">{rank.total_records > 0 ? `${rank.total_records} records` : 'No data'}</p>
                </div>
              </div>
              {rank.total_records > 0 ? (
                <div className="text-right">
                  <p className={`text-sm font-bold ${rank.rate >= 90 ? 'text-emerald-600' : rank.rate >= 75 ? 'text-violet-600' : 'text-rose-600'}`}>{rank.rate}%</p>
                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                    <div className={`h-full rounded-full ${rank.rate >= 90 ? 'bg-emerald-500' : rank.rate >= 75 ? 'bg-violet-500' : 'bg-rose-500'}`} style={{ width: `${rank.rate}%` }} />
                  </div>
                </div>
              ) : <span className="text-[10px] text-slate-300 italic">N/A</span>}
            </div>
          ))}
        </div>
      )}
    </CardBody>
  </SectionCard>
);

const SubjectPerformance = ({ data }) => (
  <SectionCard>
    <SectionHeader title="Subject Performance" subtitle="Average grades across subjects" />
    <CardBody className="p-4 h-[300px] sm:h-[340px]">
      {!data?.length ? (
        <EmptyState icon={<BookOpen className="w-8 h-8" />} title="No subject data" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
              interval={0} angle={-45} textAnchor="end" height={50} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={(props) => <ChartTooltip {...props} unit="%" />} />
            <Bar dataKey="avg_grade" radius={[4, 4, 0, 0]} barSize={28}>
              {data.map((entry, i) => <Cell key={i} fill={gradeColor(entry.avg_grade)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardBody>
  </SectionCard>
);

const UserTraffic = ({ data }) => (
  <SectionCard>
    <SectionHeader title="Active Users" subtitle="24-hour engagement trend" />
    <CardBody className="p-4 h-[300px] sm:h-[340px]">
      {!data?.length ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title="No traffic data" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={ChartTooltip} />
            <Area type="stepAfter" dataKey="users" stroke="#10b981" strokeWidth={2} fill="url(#gUsers)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </CardBody>
  </SectionCard>
);

const GradeDistributionPie = ({ data, total, label }) => {
  const sum = data?.reduce((s, d) => s + d.value, 0) || 0;
  return (
    <SectionCard>
      <SectionHeader title="Grade Distribution" subtitle={`Performance tier spread — ${label}`} />
      <CardBody className="p-4 h-[300px] sm:h-[340px] flex items-center gap-6">
        {!data?.length ? (
          <EmptyState icon={<PieChartIcon className="w-8 h-8" />} title="No grade data" />
        ) : (
          <>
            <div className="w-1/2 h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={4} dataKey="value">
                    {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip content={PieTooltip} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-extrabold text-slate-900">{total}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
              </div>
            </div>
            <div className="w-1/2 space-y-2.5">
              {data.map((item, i) => {
                const pct = sum > 0 ? ((item.value / sum) * 100).toFixed(1) : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm text-slate-600 truncate">{item.name.split(' (')[0]}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-slate-800">{pct}%</span>
                      <span className="text-[10px] text-slate-400">({item.value})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardBody>
    </SectionCard>
  );
};

const GradeLevelComparison = ({ data, filterLevel }) => (
  <SectionCard>
    <SectionHeader title="Performance by Group" subtitle={filterLevel === 'all' ? 'Grade level comparison' : 'Classroom comparison'} />
    <CardBody className="p-4 h-[300px] sm:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
            angle={-20} textAnchor="end" padding={{ left: 10, right: 10 }} />
          <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={(props) => <ChartTooltip {...props} unit="%" />} />
          <Bar dataKey="average" radius={[4, 4, 0, 0]} barSize={data.length === 1 ? 60 : 32}>
            {data.map((entry, i) => <Cell key={i} fill={gradeColor(entry.average)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardBody>
  </SectionCard>
);

const GradeRankings = ({ data, filterSubject, meta, timeframe }) => (
  <SectionCard>
    <SectionHeader
      title="Top Performers"
      subtitle={`${filterSubject === 'all' ? 'Top subjects' : `Top classrooms — ${meta?.subjects?.find(s => String(s.id) === String(filterSubject))?.name || ''}`} · ${timeframe === 'all' ? 'Annual' : timeframe === 'today' ? 'Today' : 'Weekly'}`}
    />
    <CardBody className="p-4 h-[300px] sm:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 30, right: 50 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="code" width={80} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
          <Tooltip content={(props) => <ChartTooltip {...props} unit="%" />} />
          <Bar dataKey="average" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((_, i) => <Cell key={i} fill={BAR_COLOR} opacity={1 - i * 0.06} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardBody>
  </SectionCard>
);

// ── Tab Content Wrapper ────────────────────────────────────────────────────

const TabBanner = ({ title, subtitle, color, children }) => {
  const gradients = {
    violet: 'from-violet-600 to-indigo-600',
    indigo: 'from-indigo-600 to-blue-600',
    emerald: 'from-emerald-600 to-teal-600',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gradient-to-br ${gradients[color] || gradients.violet} p-6 rounded-2xl text-white`}
    >
      <div>
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <p className="text-white/70 text-sm mt-1">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('system');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { periodLabel, periodOptions } = useSystemSettings();

  const systemRef = useRef(null);
  const gradesRef = useRef(null);
  const attendanceRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const [gradeData, setGradeData] = useState(null);
  const [gradeLoading, setGradeLoading] = useState(false);
  const { academicYear, setAcademicYear } = useActiveAcademicYear();
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterQuarter, setFilterQuarter] = useState('all');
  const [distributionMode, setDistributionMode] = useState('student');
  const [gradeTimeframe, setGradeTimeframe] = useState('all');

  const [attendanceAnalytics, setAttendanceAnalytics] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceTimeframe, setAttendanceTimeframe] = useState('all');

  // Fetch data
  useEffect(() => {
    if (activeTab === 'system') fetchSystem();
  }, [activeTab, academicYear]);

  useEffect(() => {
    if (activeTab === 'grades') fetchGrades();
  }, [activeTab, academicYear, filterLevel, filterSubject, filterQuarter, distributionMode, gradeTimeframe]);

  useEffect(() => {
    if (activeTab === 'attendance') fetchAttendance();
  }, [activeTab, academicYear, attendanceTimeframe]);

  const fetchSystem = async () => {
    setLoading(true); setData(null);
    try { const res = await api.get(`/admin/stats/?academic_year=${academicYear}`); setData(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchGrades = async () => {
    setGradeLoading(true); setGradeData(null);
    try {
      const res = await api.get(`/admin/grade-distribution/?academic_year=${academicYear}&grade_level=${filterLevel}&subject_id=${filterSubject}&quarter=${filterQuarter}&mode=${distributionMode}&timeframe=${gradeTimeframe}`);
      setGradeData(res.data);
    } catch (err) { console.error(err); }
    finally { setGradeLoading(false); }
  };

  const fetchAttendance = async () => {
    setAttendanceLoading(true); setAttendanceAnalytics(null);
    try { const res = await api.get(`/attendance/summary/?timeframe=${attendanceTimeframe}&academic_year=${academicYear}`); setAttendanceAnalytics(res.data); }
    catch (err) { console.error(err); }
    finally { setAttendanceLoading(false); }
  };

  const handleLevelChange = useCallback((level) => {
    setFilterLevel(level);
    if (level === 'all') return;
    const meta = gradeData?.meta || { subjects: [] };
    const levelSubjects = meta.subjects.filter(s => s.grade_level === level);
    if (!levelSubjects.some(s => String(s.id) === String(filterSubject))) setFilterSubject('all');
  }, [gradeData, filterSubject]);

  const handleYearChange = useCallback((dir) => {
    if (!academicYear) return;
    const [start, end] = academicYear.split('-').map(Number);
    const newYear = dir === 'next' ? `${start + 1}-${end + 1}` : `${start - 1}-${end - 1}`;
    setAcademicYear(newYear);
    setFilterLevel('all'); setFilterSubject('all'); setFilterQuarter('all');
    setGradeTimeframe('all'); setAttendanceTimeframe('all');
    setData(null); setGradeData(null); setAttendanceAnalytics(null);
  }, [academicYear, setAcademicYear]);

  const handleExport = async (ref, tab) => {
    setExporting(true);
    try {
      const titles = {
        system: ['System Overview', `SY ${academicYear}`],
        grades: ['Academic Performance', `${academicYear} · ${filterLevel !== 'all' ? filterLevel : 'All Levels'}`],
        attendance: ['Attendance Dynamics', `${academicYear} · ${attendanceTimeframe === 'all' ? 'All-Time' : attendanceTimeframe}`],
      };
      const [title, subtitle] = titles[tab] || ['Analytics Report', academicYear];
      await exportToPDF(ref, `knhs-${tab}-analytics-${academicYear}.pdf`, title, subtitle);
    } finally { setExporting(false); }
  };

  const tabs = [
    { id: 'system', label: 'System Overview', shortLabel: 'System', icon: Zap },
    { id: 'grades', label: 'Academic Performance', shortLabel: 'Grades', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance Dynamics', shortLabel: 'Attendance', icon: Clock },
  ];

  const hasAttendanceData = attendanceAnalytics && (
    attendanceAnalytics.daily_trends?.length > 0 ||
    attendanceAnalytics.section_rankings?.length > 0 ||
    attendanceAnalytics.pie_data?.some(d => d.value > 0) ||
    attendanceAnalytics.grade_trends?.length > 0
  );

  return (
    <motion.div
      className="max-w-[1400px] mx-auto px-4 py-6 space-y-6"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Analytics</h1>
            <p className="text-sm text-slate-400">Data Intelligence · SY {academicYear}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport({ system: systemRef, grades: gradesRef, attendance: attendanceRef }[activeTab], activeTab)}
          disabled={exporting}
          icon={exporting ? undefined : Download}
        >
          {exporting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin" />
              Exporting...
            </span>
          ) : 'Export PDF'}
        </Button>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={staggerItem} className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          );
        })}
      </motion.div>

      {/* System Tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'system' && (
          <motion.div key="system" {...fadeUp} className="space-y-5" ref={systemRef}>
            {loading && !data ? (
              <div className="space-y-4">
                <Skeleton.Banner />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton.StatCard key={i} />)}
                </div>
                <Skeleton.Table rows={5} cols={2} />
              </div>
            ) : (
              <>
                <TabBanner title="System Intelligence" subtitle="Live portal performance metrics" color="violet">
                  <YearSelector year={academicYear} onChange={handleYearChange} />
                </TabBanner>

                <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Students" value={data?.dashboard?.total_students} icon={Users} color="blue" />
                  <StatCard label="Faculty" value={data?.dashboard?.total_teachers} icon={Users} color="green" />
                  <StatCard label="Active Classes" value={data?.dashboard?.total_classes} icon={Eye} color="violet" />
                  <StatCard label="Pending Tasks" value={data?.dashboard?.pending_approvals} icon={Clock} color={data?.dashboard?.pending_approvals > 0 ? 'red' : 'green'} />
                </motion.div>

                {!data ? (
                  <EmptyState icon={<AlertTriangle className="w-8 h-8" />} title="Failed to load data" description="Check server connection" />
                ) : (
                  <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="lg:col-span-2">
                      <AttendanceTrends data={data?.attendance?.daily_trends} />
                    </div>
                    <SubjectPerformance data={data?.grades?.subject_stats} />
                    <UserTraffic data={data?.dashboard?.charts?.active_users_trends} />
                    <div className="lg:col-span-2">
                      <InsightsPanel items={interpretSystem(data)} />
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Grades Tab */}
        {activeTab === 'grades' && (
          <motion.div key="grades" {...fadeUp} className="space-y-5" ref={gradesRef}>
            {gradeLoading && !gradeData ? (
              <div className="space-y-4">
                <Skeleton.Banner />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton.StatCard key={i} />)}
                </div>
                <Skeleton.Table rows={5} cols={2} />
              </div>
            ) : (
              <>
                <TabBanner title="Academic Intelligence" subtitle={`Performance distribution — ${academicYear}`} color="indigo">
                  <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                    <FilterDropdown label="Grade Level" value={filterLevel} onChange={e => handleLevelChange(e.target.value)}
                      options={[{ value: 'all', label: 'All Levels' }, ...(gradeData?.meta?.grade_levels || []).map(l => ({ value: l, label: l }))]} />
                    <FilterDropdown label="Subject" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                      options={[{ value: 'all', label: 'All Subjects' }, ...(gradeData?.meta?.subjects || []).map(s => ({ value: s.id, label: s.name }))]} />
                    <FilterDropdown label="View Mode" value={distributionMode} onChange={e => setDistributionMode(e.target.value)}
                      options={[{ value: 'student', label: 'General Average' }, { value: 'entry', label: 'Cumulative Grades' }]} />
                    <FilterDropdown label={periodLabel} value={filterQuarter} onChange={e => setFilterQuarter(e.target.value)}
                      options={[{ value: 'all', label: 'All' }, ...periodOptions.map(o => ({ value: o.value, label: o.label }))]} />
                    <FilterDropdown label="Period" value={gradeTimeframe} onChange={e => setGradeTimeframe(e.target.value)}
                      options={[{ value: 'all', label: 'All Time' }, { value: 'today', label: 'Today' }, { value: 'weekly', label: 'This Week' }]} />
                    <YearSelector year={academicYear} onChange={handleYearChange} />
                  </div>
                </TabBanner>

                <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-3 gap-3">
                  <StatCard label="Average Score" value={`${gradeData?.overall_average || 0}%`} icon={TrendingUp} color="violet" />
                  <StatCard label="Students Graded" value={gradeData?.total_students || 0} icon={Users} color="green" />
                  <StatCard label="Grade Entries" value={gradeData?.total_entries || 0} icon={FileText} color="blue" />
                </motion.div>

                {!gradeData || gradeData.total_students === 0 ? (
                  <EmptyState icon={<GraduationCap className="w-8 h-8" />} title="No grade data" description="Adjust filters to view academic performance" />
                ) : (
                  <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <GradeDistributionPie data={gradeData.category_counts}
                      total={distributionMode === 'student' ? gradeData.total_students : gradeData.total_entries}
                      label={distributionMode === 'student' ? 'Students' : 'Entries'} />
                    <GradeLevelComparison data={gradeData.by_level} filterLevel={filterLevel} />
                    <div className="lg:col-span-2">
                      <GradeRankings data={gradeData.by_group} filterSubject={filterSubject} meta={gradeData.meta} timeframe={gradeTimeframe} />
                    </div>
                    <div className="lg:col-span-2">
                      <InsightsPanel items={interpretGrades(gradeData, filterLevel, filterSubject, filterQuarter, periodLabel)} />
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <motion.div key="attendance" {...fadeUp} className="space-y-5" ref={attendanceRef}>
            {attendanceLoading && !attendanceAnalytics ? (
              <div className="space-y-4">
                <Skeleton.Banner />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton.StatCard key={i} />)}
                </div>
                <Skeleton.Table rows={5} cols={2} />
              </div>
            ) : (
              <>
                <TabBanner title="Attendance Dynamics" subtitle={`Student presence & engagement — ${academicYear}`} color="emerald">
                  <div className="flex gap-3">
                    <FilterDropdown label="Period" value={attendanceTimeframe} onChange={e => setAttendanceTimeframe(e.target.value)}
                      options={[{ value: 'all', label: 'All Time' }, { value: 'today', label: 'Today' }, { value: 'weekly', label: 'Past 7 Days' }]} />
                    <YearSelector year={academicYear} onChange={handleYearChange} />
                  </div>
                </TabBanner>

                {!hasAttendanceData ? (
                  <EmptyState icon={<Clock className="w-8 h-8" />} title="No attendance data" description={attendanceTimeframe === 'all' ? 'Start encoding attendance to see analytics' : `No records for "${attendanceTimeframe.toUpperCase()}" period`} />
                ) : (
                  <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="lg:col-span-2">
                      <AttendanceTrends data={attendanceAnalytics.daily_trends} />
                    </div>
                    <AttendancePie data={attendanceAnalytics.pie_data} />
                    <SectionRankings rankings={attendanceAnalytics.section_rankings} period={attendanceAnalytics.period} />
                    <div className="lg:col-span-2">
                      <AttendanceByLevel data={attendanceAnalytics.grade_trends} />
                    </div>
                    <div className="lg:col-span-2">
                      <InsightsPanel items={interpretAttendance(attendanceAnalytics)} />
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Analytics;
