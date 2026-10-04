/**
 * Pure helpers for the Students directory: status maps, grade/section
 * normalization, group-by building, column preferences, formatting and the
 * debounced-value hook. No data fetching lives here.
 */
import { useState, useEffect } from 'react';

// ── Student (record) status — Profile.enrollment_status ─────────────────────
export const ENROLLMENT_STATUS = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  enrolled: { label: 'Enrolled', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactive', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  transferred: { label: 'Transferred Out', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  dropped: { label: 'Dropped', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
  graduated: { label: 'Graduated', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

export const ENROLLMENT_STATUS_OPTIONS = [
  'active', 'enrolled', 'inactive', 'withdrawn', 'transferred', 'dropped', 'graduated',
].map(v => ({ value: v, label: ENROLLMENT_STATUS[v].label }));

// ── Account status — User.account_status (different fact, see §12) ──────────
export const ACCOUNT_STATUS = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Disabled', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  suspended: { label: 'Suspended', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
  pending_reset: { label: 'Password Reset', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const enrollmentStatus = v =>
  ENROLLMENT_STATUS[v] || { label: v ? String(v) : '—', cls: 'bg-slate-100 text-slate-500 border-slate-200' };

export const accountStatus = v =>
  ACCOUNT_STATUS[v] || { label: v ? String(v) : '—', cls: 'bg-slate-100 text-slate-500 border-slate-200' };

// ── Grades & sections ───────────────────────────────────────────────────────
export const GRADE_ORDER = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

export const normalizeGrade = (g) => {
  if (!g) return '';
  const s = String(g).trim();
  if (/^grade\s+\d+$/i.test(s)) return s.replace(/grade/i, 'Grade');
  if (/^\d+$/.test(s)) return `Grade ${s}`;
  return s;
};

export const gradeDigit = (g) => {
  const s = String(g || '').match(/\d+/);
  return s ? s[0] : '';
};

export const studentName = (s) =>
  `${s?.first_name || ''} ${s?.last_name || ''}`.trim() || s?.username || 'Unnamed';

export const studentInitials = (s) =>
  ((s?.first_name || '?')[0] + (s?.last_name || s?.first_name || '')[0]).toUpperCase();

export const studentLrn = (s) =>
  s?.profile?.lrn || s?.profile?.registration_number || s?.username || '—';

export const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── Columns (customizable, persisted) ───────────────────────────────────────
export const DIRECTORY_COLUMNS = [
  { id: 'sex', label: 'Sex', defaultOn: true },
  { id: 'grade_section', label: 'Grade & Section', defaultOn: true },
  { id: 'contact', label: 'Contact', defaultOn: true },
  { id: 'student_status', label: 'Status', defaultOn: true },
  { id: 'account', label: 'Account', defaultOn: false },
  { id: 'lrn', label: 'LRN', defaultOn: false },
  { id: 'date_joined', label: 'Date Enrolled', defaultOn: false },
];

const COLUMNS_KEY = 'knhs_student_directory_columns';

export function loadColumnPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMNS_KEY) || '{}');
    const prefs = {};
    DIRECTORY_COLUMNS.forEach(c => { prefs[c.id] = typeof raw[c.id] === 'boolean' ? raw[c.id] : c.defaultOn; });
    return prefs;
  } catch {
    const prefs = {};
    DIRECTORY_COLUMNS.forEach(c => { prefs[c.id] = c.defaultOn; });
    return prefs;
  }
}

export function saveColumnPrefs(prefs) {
  try { localStorage.setItem(COLUMNS_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
}

// ── Server-side sortable headers (must match backend ordering_fields) ───────
export const SORTERS = {
  student: { field: 'last_name', label: 'Student Name' },
  grade: { field: 'profile__grade_level', label: 'Grade' },
  student_status: { field: 'profile__enrollment_status', label: 'Status' },
  date_joined: { field: 'date_joined', label: 'Date Enrolled' },
};

export function nextOrdering(current, sorterId) {
  const field = SORTERS[sorterId].field;
  if (current === field) return `-${field}`;
  if (current === `-${field}`) return field;
  return field;
}

export function activeSorterId(ordering) {
  if (!ordering) return null;
  const bare = ordering.startsWith('-') ? ordering.slice(1) : ordering;
  const hit = Object.entries(SORTERS).find(([, v]) => v.field === bare);
  return hit ? hit[0] : null;
}

// ── Grouping (§20: None / Grade & Section (default) / Sex) ──────────────────
export const GROUP_OPTIONS = [
  { value: 'grade', label: 'Grade & Section' },
  { value: 'sex', label: 'Sex' },
  { value: 'none', label: 'No grouping' },
];

/**
 * Bucket students for display. Server order is preserved inside each group so
 * the active sort always wins; group order is stable (grade order, then sex).
 */
export function buildGroups(students, groupBy) {
  if (groupBy === 'none') {
    return [{ key: 'all', label: null, sections: [{ key: 'all', label: null, students }] }];
  }

  if (groupBy === 'sex') {
    const buckets = { male: [], female: [], other: [] };
    students.forEach(s => {
      const sx = (s.profile?.sex || '').toLowerCase();
      (buckets[sx] || buckets.other).push(s);
    });
    return ['male', 'female', 'other']
      .filter(k => buckets[k].length > 0)
      .map(k => ({
        key: k,
        label: k === 'other' ? 'Other' : k[0].toUpperCase() + k.slice(1),
        sections: [{ key: k, label: null, students: buckets[k] }],
      }));
  }

  // Grade & Section
  const byGrade = {};
  students.forEach(s => {
    let grade = normalizeGrade(s.profile?.grade_level) || 'Unassigned';
    if (grade !== 'Unassigned' && !/^Grade \d+$/.test(grade)) grade = grade || 'Unassigned';
    const section = s.profile?.classroom_name || 'No Section';
    (byGrade[grade] ||= {});
    (byGrade[grade][section] ||= []).push(s);
  });

  return Object.keys(byGrade)
    .sort((a, b) => {
      const ia = GRADE_ORDER.indexOf(a);
      const ib = GRADE_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    })
    .map(grade => ({
      key: grade,
      label: grade,
      sections: Object.keys(byGrade[grade]).sort().map(name => ({
        key: name,
        label: name,
        students: byGrade[grade][name],
      })),
    }));
}

// ── Debounced value ─────────────────────────────────────────────────────────
export function useDebouncedValue(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
