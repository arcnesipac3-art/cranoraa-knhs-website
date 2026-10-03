import { useState, useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';

export function AssignSectionModal({
  isOpen,
  onClose,
  onConfirm,
  student,
  classrooms,
  loadingClassrooms = false,
  title = 'Assign Section',
  confirmText = 'Assign',
}) {
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [error, setError] = useState('');
  const selectRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedClassroomId('');
      setError('');
      setTimeout(() => selectRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const normalizeGrade = (g) => {
    if (!g) return '';
    const s = String(g).trim();
    if (/^\d+$/.test(s)) return s;
    const match = s.match(/(\d+)/);
    return match ? match[1] : s;
  };

  const filteredClassrooms = useMemo(() => {
    if (!student?.profile?.grade_level) return classrooms || [];
    const studentGrade = normalizeGrade(student.profile.grade_level);
    if (!studentGrade) return classrooms || [];
    return (classrooms || []).filter(c => normalizeGrade(c.grade_level) === studentGrade);
  }, [classrooms, student?.profile?.grade_level]);

  const currentSection = student?.profile?.classroom_name || null;
  const gradeLabel = student?.profile?.grade_level ? `Grade ${normalizeGrade(student.profile.grade_level)}` : '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedClassroomId) {
      setError('Please select a section');
      return;
    }
    onConfirm(selectedClassroomId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10010] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md border border-slate-200 shadow-2xl rounded-xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-4 flex-shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-[0.1em] leading-none">{title}</h2>
              {student && (
                <p className="text-violet-200 text-[11px] mt-1 font-medium">
                  {student.first_name} {student.last_name}
                  {gradeLabel && <span className="text-violet-300 ml-1.5">· {gradeLabel}</span>}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/15 hover:text-white transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 pt-5 pb-2 flex-1 overflow-y-auto">
            {currentSection && (
              <div className="mb-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">Current:</span>
                <span className="text-xs font-bold text-slate-700">{currentSection}</span>
              </div>
            )}

            <label className="block text-[10px] font-bold text-slate-500 tracking-[0.1em] mb-2">
              Select a section{gradeLabel ? ` for ${gradeLabel}` : ''}
            </label>

            {loadingClassrooms ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <div className="w-4 h-4 border border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Loading sections...</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredClassrooms.length === 0 ? (
                  <div className="flex items-center gap-2.5 px-4 py-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-xs font-semibold text-amber-700">No sections available for this grade level.</p>
                  </div>
                ) : (
                  filteredClassrooms.map(c => {
                    const count = c.student_count ?? 0;
                    const cap = c.capacity ?? 40;
                    const isFull = count >= cap;
                    const isSelected = String(selectedClassroomId) === String(c.id);
                    const pct = cap > 0 ? Math.round((count / cap) * 100) : 0;

                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-3.5 py-3 rounded-lg border cursor-pointer transition-all ${
                          isFull ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' :
                          isSelected ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-200' :
                          'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          ref={isSelected ? selectRef : undefined}
                          type="radio"
                          name="classroom-select"
                          value={c.id}
                          checked={isSelected}
                          disabled={isFull}
                          onChange={() => { setSelectedClassroomId(c.id); setError(''); }}
                          className="w-4 h-4 text-violet-600 border-slate-300 focus:ring-violet-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">{c.name}</span>
                            {isFull && (
                              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded border border-rose-200">
                                Full
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-rose-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                              {count}/{cap} enrolled
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-1.5 px-3 py-2 mt-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[11px] font-semibold">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L10.586 10l-3.293 3.293a1 1 0 101.414 1.414L10 11.414l3.293 3.293a1 1 0 001.414-1.414L11.414 10l3.293-3.293a1 1 0 00-1.414-1.414L10 8.586 6.707 5.293a1 1 0 00-1.414 1.414L8.586 10l-3.293 3.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-white text-slate-600 text-[11px] font-bold tracking-[0.1em] border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedClassroomId || loadingClassrooms}
              className="px-6 py-2.5 bg-[#5e2a84] text-white text-[11px] font-bold tracking-[0.1em] hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingClassrooms ? 'Loading...' : confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
