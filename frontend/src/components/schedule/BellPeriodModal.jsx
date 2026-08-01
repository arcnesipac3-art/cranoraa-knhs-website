import { memo, useMemo } from 'react';
import { Modal } from '../ui';

const DAYS = ['monday','tuesday','wednesday','thursday','friday'];
const DAY_FULL = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday' };
const DAY_SHORT = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri' };

export const SLOT_TYPES = [
  { value: 'class',    label: 'Class',    color: 'bg-violet-100 text-violet-700 border-violet-200',  barBg: '#f5f3ff', barBorder: '#c4b5fd', barText: '#6d28d9' },
  { value: 'recess',  label: 'Recess',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200', barBg: '#ecfdf5', barBorder: '#6ee7b7', barText: '#047857' },
  { value: 'lunch',   label: 'Lunch',    color: 'bg-amber-100 text-amber-700 border-amber-200',    barBg: '#fffbeb', barBorder: '#fcd34d', barText: '#b45309' },
  { value: 'vacant',  label: 'Vacant',   color: 'bg-slate-100 text-slate-500 border-slate-200',    barBg: '#f8fafc', barBorder: '#e2e8f0', barText: '#64748b' },
  { value: 'assembly',label: 'Assembly', color: 'bg-indigo-100 text-indigo-700 border-indigo-200',  barBg: '#eef2ff', barBorder: '#a5b4fc', barText: '#4338ca' },
  { value: 'pe',      label: 'PE',       color: 'bg-rose-100 text-rose-700 border-rose-200',        barBg: '#fff1f2', barBorder: '#fda4af', barText: '#be123c' },
];
export const SLOT_TYPE_MAP = Object.fromEntries(SLOT_TYPES.map(t => [t.value, t]));

const normalizeTime = (v) => {
  if (!v) return '';
  const m = String(v).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2,'0')}:${m[2]}` : String(v).slice(0,5);
};
const periodKey = (s, e) => `${normalizeTime(s)}-${normalizeTime(e)}`;
const durationMins = (s, e) => {
  const [sh,sm] = normalizeTime(s).split(':').map(Number);
  const [eh,em] = normalizeTime(e).split(':').map(Number);
  return (eh*60+em)-(sh*60+sm);
};
const fmtDur = (min) => min <= 0 ? '—' : min >= 60 ? `${Math.floor(min/60)}h${min%60 ? ` ${min%60}m` : ''}` : `${min}m`;

// ── Day chips segmented control ──────────────────────────────────────────────
const DayChips = memo(({ selected, onChange }) => (
  <div>
    <div className="flex items-center gap-1 flex-wrap">
      {DAYS.map(d => {
        const active = selected.includes(d);
        return (
          <button key={d} type="button"
            onClick={() => onChange(active ? selected.filter(x => x !== d) : [...selected, d])}
            aria-pressed={active}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 ${
              active
                ? 'bg-violet-600 text-white border-violet-700 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600'
            }`}>
            {DAY_SHORT[d]}
          </button>
        );
      })}
    </div>
    <div className="flex items-center gap-3 mt-2">
      <button type="button" onClick={() => onChange([...DAYS])}
        className="text-[10px] font-bold text-violet-600 hover:text-violet-800 transition-colors">
        Weekdays
      </button>
      <span className="text-slate-200 text-xs">|</span>
      <button type="button" onClick={() => onChange([])}
        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
        Clear
      </button>
      <span className="text-[10px] text-slate-400 ml-auto">
        {selected.length === 0 ? 'No days selected' : `${selected.length}/5 selected`}
      </span>
    </div>
  </div>
));

// ── Live validation for the add-period form ──────────────────────────────────
function useSlotValidation(slotForm, timeSlots) {
  return useMemo(() => {
    const errs = [];
    const dur = durationMins(slotForm.start_time, slotForm.end_time);
    if (dur <= 0) errs.push('End time must be after start time.');
    else if (dur < 5) errs.push('Duration is too short (minimum 5 minutes).');
    if (!slotForm.label.trim()) errs.push('Period label is required.');
    if (slotForm.days.length === 0) errs.push('Select at least one day.');
    return errs;
  }, [slotForm.start_time, slotForm.end_time, slotForm.label, slotForm.days, timeSlots]);
}

// ── Summary stats ─────────────────────────────────────────────────────────────
function useSummary(uniquePeriods, timeSlots, filterClassroom) {
  return useMemo(() => {
    const classPeriods = uniquePeriods.filter(p => p.slot_type === 'class');
    const breakPeriods = uniquePeriods.filter(p => p.slot_type !== 'class');
    const classMin = classPeriods.reduce((s, p) => s + Math.max(0, durationMins(p.start_time, p.end_time)), 0);
    const breakMin = breakPeriods.reduce((s, p) => s + Math.max(0, durationMins(p.start_time, p.end_time)), 0);
    const sorted = [...uniquePeriods].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const missingDays = classPeriods.reduce((acc, p) => {
      DAYS.forEach(d => {
        if (!timeSlots.some(ts => ts.day === d && periodKey(ts.start_time, ts.end_time) === periodKey(p.start_time, p.end_time))) {
          if (!filterClassroom || true) acc++;
        }
      });
      return acc;
    }, 0);
    return { classPeriods: classPeriods.length, breakPeriods: breakPeriods.length, classMin, breakMin, first, last, missingDays };
  }, [uniquePeriods, timeSlots, filterClassroom]);
}

// ── Period card ───────────────────────────────────────────────────────────────
const PeriodCard = memo(({
  period, sortedSlots, timeSlots, editingSlot, editSlotForm, setEditSlotForm,
  savingSlot, startEditSlot, cancelEditSlot, saveEditSlot, deleteSlot, applyToAllDays,
}) => {
  const pk = periodKey(period.start_time, period.end_time);
  const isEditing = editingSlot && periodKey(editingSlot.start_time, editingSlot.end_time) === pk;
  const dayCount = DAYS.filter(d => timeSlots.some(ts => ts.day === d && periodKey(ts.start_time, ts.end_time) === pk)).length;
  const isFull = dayCount === DAYS.length;
  const isBreak = period.slot_type !== 'class';
  const ts = SLOT_TYPE_MAP[period.slot_type] || SLOT_TYPE_MAP.class;
  const dur = durationMins(period.start_time, period.end_time);

  const presentDays = DAYS.filter(d => timeSlots.some(t => t.day === d && periodKey(t.start_time, t.end_time) === pk));
  const missingDays = DAYS.filter(d => !timeSlots.some(t => t.day === d && periodKey(t.start_time, t.end_time) === pk));

  return (
    <div className={`rounded-xl border transition-all overflow-hidden ${
      isEditing ? 'border-violet-300 ring-2 ring-violet-200/60 bg-white' :
      isBreak ? 'border-dashed' : 'border-slate-200 bg-white hover:border-violet-200 hover:shadow-sm'
    }`} style={isBreak && !isEditing ? { borderColor: ts.barBorder, background: ts.barBg } : undefined}>

      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Type accent */}
        <div className="w-1 h-10 rounded-full shrink-0" style={{ background: ts.barText }} />

        {/* Time + label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold text-slate-900">
              {period.start_display || normalizeTime(period.start_time)} – {period.end_display || normalizeTime(period.end_time)}
            </span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{fmtDur(dur)}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${ts.color}`}
              style={{ background: ts.barBg, borderColor: ts.barBorder, color: ts.barText }}>
              {ts.label}
            </span>
          </div>
          {period.label && (
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide mt-0.5">{period.label}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isBreak && !isFull && dayCount > 0 && (
            <button type="button" onClick={() => applyToAllDays(period)} disabled={savingSlot}
              title="Copy to all weekdays"
              className="px-2 py-1 rounded-lg text-[9px] font-bold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-all">
              Fill all days
            </button>
          )}
          {!isBreak && (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {dayCount}/{DAYS.length} days
            </span>
          )}
          {!isBreak && (
            <button type="button" aria-label={isEditing ? 'Cancel edit' : 'Edit period'}
              onClick={() => {
                if (isEditing) { cancelEditSlot(); }
                else {
                  const slot = sortedSlots.find(s => periodKey(s.start_time, s.end_time) === pk);
                  if (slot) startEditSlot(slot);
                }
              }}
              className={`p-1.5 rounded-lg transition-all ${isEditing ? 'bg-violet-100 text-violet-600' : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Compact day chips row */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {presentDays.map(d => {
            const slot = sortedSlots.find(s => s.day === d && periodKey(s.start_time, s.end_time) === pk);
            const isBeingEdited = isEditing && editingSlot?.day === d;
            return (
              <div key={d}
                className={`group/chip inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  isBeingEdited ? 'bg-violet-100 border-violet-400 text-violet-800 ring-1 ring-violet-400' : ''
                }`}
                style={!isBeingEdited ? { background: ts.barBg, borderColor: ts.barBorder, color: ts.barText } : undefined}>
                <span>{DAY_SHORT[d]}</span>
                {!isBreak && slot && !isBeingEdited && (
                  <>
                    <button type="button" onClick={() => startEditSlot(slot)} title="Edit this day's slot"
                      className="opacity-0 group-hover/chip:opacity-100 transition-opacity text-current hover:scale-110">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button type="button" onClick={() => deleteSlot(slot.id, `${DAY_SHORT[d]} ${normalizeTime(slot.start_time)}`)} title="Remove this day"
                      className="opacity-0 group-hover/chip:opacity-100 transition-opacity text-rose-400 hover:text-rose-600">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </>
                )}
                {isBeingEdited && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />}
              </div>
            );
          })}
          {missingDays.map(d => (
            <div key={d} className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-medium border border-dashed border-slate-200 text-slate-300">
              {DAY_SHORT[d]}
            </div>
          ))}
        </div>
      </div>

      {/* Inline edit form */}
      {isEditing && !isBreak && (
        <div className="px-4 pb-4 border-t border-violet-100 bg-violet-50/30">
          <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide pt-3 mb-2">Editing slot</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap items-end gap-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Day</label>
              <select value={editSlotForm.day} onChange={e => setEditSlotForm(f => ({...f, day: e.target.value}))}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                {DAYS.map(d => <option key={d} value={d}>{DAY_FULL[d]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Start</label>
              <input type="time" value={editSlotForm.start_time} onChange={e => setEditSlotForm(f => ({...f, start_time: e.target.value}))}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">End</label>
              <input type="time" value={editSlotForm.end_time} onChange={e => setEditSlotForm(f => ({...f, end_time: e.target.value}))}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Type</label>
              <select value={editSlotForm.slot_type || 'class'} onChange={e => setEditSlotForm(f => ({...f, slot_type: e.target.value}))}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                {SLOT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Label</label>
              <input value={editSlotForm.label} onChange={e => setEditSlotForm(f => ({...f, label: e.target.value}))}
                placeholder="e.g. Period 1"
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-28" />
            </div>
            <div className="flex gap-1.5 items-end">
              <button type="button" onClick={saveEditSlot} disabled={savingSlot}
                className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 disabled:opacity-50">
                {savingSlot ? '…' : 'Save'}
              </button>
              <button type="button" onClick={() => deleteSlot(editingSlot.id, `${DAY_SHORT[editingSlot.day]} ${normalizeTime(editingSlot.start_time)}`)}
                disabled={savingSlot}
                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold hover:bg-rose-100 disabled:opacity-50">
                Delete
              </button>
              <button type="button" onClick={cancelEditSlot}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[10px] font-bold hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
PeriodCard.displayName = 'PeriodCard';

// ── Main modal component ──────────────────────────────────────────────────────
const BellPeriodModal = ({
  open, onClose,
  sectionName, uniquePeriods, sortedSlots, timeSlots, filterClassroom,
  slotForm, setSlotForm, savingSlot,
  editingSlot, editSlotForm, setEditSlotForm,
  startEditSlot, cancelEditSlot, saveEditSlot, deleteSlot,
  applyStandardBell, fillMissingSlots, clearAllTimeSlots, applyToAllDays, saveSlotBulk,
  showTutorial, setShowTutorial, tutorialStep, setTutorialStep, tutorialSteps, dismissTutorial, nextTutorial, prevTutorial,
}) => {
  const validationErrors = useSlotValidation(slotForm, timeSlots);
  const summary = useSummary(uniquePeriods, timeSlots, filterClassroom);
  const canSubmit = validationErrors.length === 0;

  const handleClose = () => { onClose(); cancelEditSlot(); };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="full"
      title="Bell Periods"
      subtitle={sectionName
        ? `${sectionName} · ${uniquePeriods.length} period${uniquePeriods.length !== 1 ? 's' : ''} configured`
        : 'Configure class periods for this section'}
    >
      {/* ── Two-column layout ── */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden" style={{ maxHeight: 'calc(88vh - 130px)' }}>

        {/* LEFT PANEL */}
        <div className="w-full md:w-[300px] shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/60 overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* Section badge */}
            {sectionName && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 border border-violet-100">
                <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                <span className="text-[11px] font-bold text-violet-700 truncate">{sectionName}</span>
              </div>
            )}

            {/* Quick actions card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Quick Actions</p>
              </div>
              <div className="p-3 space-y-2">
                <button type="button" onClick={() => applyStandardBell(false)} disabled={savingSlot}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-all shadow-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  Apply Standard Schedule
                </button>
                <button type="button" onClick={fillMissingSlots} disabled={savingSlot || !uniquePeriods.length}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100 disabled:opacity-50 transition-all">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                  </svg>
                  Fill Missing Days
                </button>
                {timeSlots.length > 0 && (
                  <button type="button" onClick={clearAllTimeSlots} disabled={savingSlot}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 disabled:opacity-50 transition-all">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Clear All ({timeSlots.length})
                  </button>
                )}
              </div>
            </div>

            {/* Add period card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">New Period</p>
              </div>
              <form onSubmit={saveSlotBulk} className="p-3 space-y-3">
                {/* Label */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1" htmlFor="slot-label">
                    Label <span className="text-rose-400">*</span>
                  </label>
                  <input id="slot-label" value={slotForm.label} onChange={e => setSlotForm(f => ({...f, label: e.target.value}))}
                    placeholder="e.g. Period 1, Lunch…"
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${!slotForm.label.trim() && slotForm.label !== undefined ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'}`} />
                </div>

                {/* Type chips */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Type</label>
                  <div className="flex flex-wrap gap-1">
                    {SLOT_TYPES.map(t => (
                      <button key={t.value} type="button"
                        onClick={() => setSlotForm(f => ({...f, slot_type: t.value, label: f.label || t.label}))}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${slotForm.slot_type === t.value ? t.color + ' ring-1 ring-offset-1' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1" htmlFor="slot-start">Start <span className="text-rose-400">*</span></label>
                    <input id="slot-start" required type="time" value={slotForm.start_time}
                      onChange={e => setSlotForm(f => ({...f, start_time: e.target.value}))}
                      className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1" htmlFor="slot-end">End <span className="text-rose-400">*</span></label>
                    <input id="slot-end" required type="time" value={slotForm.end_time}
                      onChange={e => setSlotForm(f => ({...f, end_time: e.target.value}))}
                      className={`w-full px-2 py-2 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${durationMins(slotForm.start_time, slotForm.end_time) <= 0 ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'}`} />
                  </div>
                </div>

                {/* Duration preview */}
                {slotForm.start_time && slotForm.end_time && (
                  <p className={`text-[10px] font-semibold ${durationMins(slotForm.start_time, slotForm.end_time) > 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                    Duration: {fmtDur(durationMins(slotForm.start_time, slotForm.end_time))}
                  </p>
                )}

                {/* Day chips */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Days <span className="text-rose-400">*</span></label>
                  <DayChips selected={slotForm.days} onChange={days => setSlotForm(f => ({...f, days}))} />
                </div>

                {/* Validation errors */}
                {validationErrors.length > 0 && (
                  <div className="space-y-1">
                    {validationErrors.map((e, i) => (
                      <p key={i} className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-600">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        {e}
                      </p>
                    ))}
                  </div>
                )}

                <button type="submit" disabled={savingSlot || !canSubmit}
                  className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {savingSlot ? 'Adding…' : `Add to ${slotForm.days.length} day${slotForm.days.length !== 1 ? 's' : ''}`}
                </button>
              </form>
            </div>

            {/* Live summary */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Schedule Summary</p>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { label: 'Class Periods', value: summary.classPeriods },
                  { label: 'Break Periods', value: summary.breakPeriods },
                  { label: 'Teaching Time', value: fmtDur(summary.classMin) },
                  { label: 'Break Time',    value: fmtDur(summary.breakMin) },
                  { label: 'First Period',  value: summary.first ? (summary.first.start_display || normalizeTime(summary.first.start_time)) : '—' },
                  { label: 'Last Period',   value: summary.last ? (summary.last.end_display || normalizeTime(summary.last.end_time)) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg px-2.5 py-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
              {summary.missingDays > 0 && (
                <div className="mx-3 mb-3 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <p className="text-[10px] font-semibold text-amber-700">{summary.missingDays} gap{summary.missingDays !== 1 ? 's' : ''} detected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
          {/* Panel header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">Period Overview</p>
              {uniquePeriods.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
                  {uniquePeriods.length} configured
                </span>
              )}
            </div>
            <button type="button" onClick={() => { setShowTutorial(true); setTutorialStep(0); }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-violet-500 hover:text-violet-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Help
            </button>
          </div>

          {/* Scrollable period list */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {uniquePeriods.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p className="text-sm font-extrabold text-slate-700 mb-2">No periods yet</p>
                <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed mb-4">
                  Click <strong className="text-violet-600">Apply Standard Schedule</strong> on the left to load a 7-period day instantly, or create custom periods manually.
                </p>
                <button type="button" onClick={() => applyStandardBell(false)}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-all shadow-md shadow-violet-200">
                  Apply Standard Schedule
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {uniquePeriods.map(period => (
                  <PeriodCard key={periodKey(period.start_time, period.end_time)}
                    period={period} sortedSlots={sortedSlots} timeSlots={timeSlots}
                    editingSlot={editingSlot} editSlotForm={editSlotForm} setEditSlotForm={setEditSlotForm}
                    savingSlot={savingSlot}
                    startEditSlot={startEditSlot} cancelEditSlot={cancelEditSlot}
                    saveEditSlot={saveEditSlot} deleteSlot={deleteSlot}
                    applyToAllDays={applyToAllDays}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tutorial overlay */}
      {showTutorial && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-xl">
          <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="h-1 w-full bg-slate-100">
              <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-300"
                style={{ width: `${((tutorialStep + 1) / tutorialSteps.length) * 100}%` }} />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tutorialSteps[tutorialStep].icon}/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{tutorialSteps[tutorialStep].title}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step {tutorialStep + 1} of {tutorialSteps.length}</p>
                </div>
                <button type="button" onClick={dismissTutorial}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{tutorialSteps[tutorialStep].desc}</p>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={dismissTutorial} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">Skip</button>
                <div className="flex items-center gap-2">
                  {tutorialStep > 0 && (
                    <button type="button" onClick={prevTutorial}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-50 transition-all uppercase tracking-wider">
                      Back
                    </button>
                  )}
                  <button type="button" onClick={nextTutorial}
                    className="px-5 py-2 rounded-lg bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 transition-all uppercase tracking-wider shadow-md shadow-violet-200">
                    {tutorialStep < tutorialSteps.length - 1 ? 'Next' : 'Got it!'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BellPeriodModal;
