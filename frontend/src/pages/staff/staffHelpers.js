/**
 * Pure helpers for the Staff directory (the former "Teachers" tab).
 *
 * Portrait-photo fallback, staff-title labels, department labels and the
 * column / sort / grouping preferences the StaffDirectory table uses.
 * No data fetching lives here.
 */
import { administration, faculty } from '../../data/facultyData';
import { accountStatus, formatDate } from '../students/directoryHelpers';

export { accountStatus, formatDate };

// ── Portrait photo (local facultyData fallback when no upload exists) ───────
const FACULTY_PHOTO_MAP = (() => {
  const map = {};
  [...administration, ...faculty].forEach((p) => {
    if (!p.photo) return;
    const parts = p.name.split(' ');
    const lastName = parts[parts.length - 1].replace(/[.,]$/, '').toLowerCase();
    map[lastName] = p.photo;
    map[p.name.toLowerCase()] = p.photo;
  });
  return map;
})();

/** Best available portrait for a portal staff object, or null. */
export function resolvePhoto(staff) {
  if (!staff) return null;
  if (staff.profile?.profile_picture) return staff.profile.profile_picture;
  const lastName = (staff.last_name || '').toLowerCase();
  if (FACULTY_PHOTO_MAP[lastName]) return FACULTY_PHOTO_MAP[lastName];
  const fullName = `${staff.first_name} ${staff.last_name}`.toLowerCase();
  if (FACULTY_PHOTO_MAP[fullName]) return FACULTY_PHOTO_MAP[fullName];
  return null;
}

// ── Staff titles (mirrors User.STAFF_TITLE_CHOICES) ─────────────────────────
export const STAFF_TITLES = [
  // DepEd teaching ranks
  { value: 'teacher_i', label: 'Teacher I' },
  { value: 'teacher_ii', label: 'Teacher II' },
  { value: 'teacher_iii', label: 'Teacher III' },
  { value: 'teacher_iv', label: 'Teacher IV' },
  { value: 'teacher_v', label: 'Teacher V' },
  { value: 'teacher_vi', label: 'Teacher VI' },
  { value: 'master_teacher_i', label: 'Master Teacher I' },
  { value: 'master_teacher_ii', label: 'Master Teacher II' },
  { value: 'special_science_teacher_i', label: 'Special Science Teacher I' },
  { value: 'als_teacher', label: 'ALS Teacher' },
  // Administrative / non-teaching
  { value: 'principal', label: 'School Principal I' },
  { value: 'guidance_counselor', label: 'Guidance Counselor' },
  { value: 'administrative_officer', label: 'Administrative Officer I' },
  { value: 'admin_assistant', label: 'Administrative Assistant' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'it_staff', label: 'IT Staff' },
  { value: 'cashier', label: 'Cashier' },
  // Legacy / fallback
  { value: 'teacher', label: 'Teacher (Generic)' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'other', label: 'Other' },
];

export const getStaffTitleLabel = (value) =>
  STAFF_TITLES.find((t) => t.value === value)?.label || value || 'Staff';

/**
 * A person may belong to several departments; `department_names` holds every
 * membership while `department_name` is the legacy single-FK mirror.
 */
export const deptLabel = (person) => {
  const names = person?.department_names;
  if (Array.isArray(names) && names.length) return names.join(', ');
  return person?.department_name || '';
};

export const staffName = (s) =>
  `${s?.profile?.title || ''} ${s?.first_name || ''} ${s?.last_name || ''}`.trim()
  || s?.username || 'Unnamed';

export const staffPlainName = (s) =>
  `${s?.first_name || ''} ${s?.last_name || ''}`.trim() || s?.username || 'Unnamed';

export const staffInitials = (s) =>
  ((s?.first_name || '?')[0] + (s?.last_name || s?.first_name || '')[0]).toUpperCase();

export const staffSex = (s) => s?.profile?.sex || '';

// ── Columns (customizable, persisted) ───────────────────────────────────────
export const STAFF_COLUMNS = [
  { id: 'sex', label: 'Sex', defaultOn: false },
  { id: 'rank', label: 'Staff Role', defaultOn: true },
  { id: 'department', label: 'Department', defaultOn: true },
  { id: 'contact', label: 'Contact', defaultOn: true },
  { id: 'account', label: 'Account', defaultOn: true },
  { id: 'adviser', label: 'Adviser', defaultOn: false },
  { id: 'date_joined', label: 'Date Joined', defaultOn: false },
];

const COLUMNS_KEY = 'knhs_staff_directory_columns';

export function loadStaffColumnPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMNS_KEY) || '{}');
    const prefs = {};
    STAFF_COLUMNS.forEach((c) => { prefs[c.id] = typeof raw[c.id] === 'boolean' ? raw[c.id] : c.defaultOn; });
    return prefs;
  } catch {
    const prefs = {};
    STAFF_COLUMNS.forEach((c) => { prefs[c.id] = c.defaultOn; });
    return prefs;
  }
}

export function saveStaffColumnPrefs(prefs) {
  try { localStorage.setItem(COLUMNS_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
}

// ── Server-side sortable headers (must match backend ordering_fields) ───────
export const STAFF_SORTERS = {
  staff: { field: 'last_name', label: 'Staff Name' },
  rank: { field: 'staff_title', label: 'Role' },
  account: { field: 'account_status', label: 'Account' },
  date_joined: { field: 'date_joined', label: 'Date Joined' },
};

// ── Grouping ────────────────────────────────────────────────────────────────
export const STAFF_GROUP_OPTIONS = [
  { value: 'department', label: 'Department' },
  { value: 'rank', label: 'Staff Role' },
  { value: 'sex', label: 'Sex' },
  { value: 'none', label: 'No grouping' },
];

/**
 * Bucket staff for display. Server order is preserved inside each group so
 * the active sort always wins; group order is stable (department A→Z, then
 * the DepEd rank order, then sex).
 */
export function buildStaffGroups(staff, groupBy) {
  const flat = (label) => [{ key: 'all', label: null, sections: [{ key: 'all', label, staff }] }];

  if (groupBy === 'none') return flat(null);

  if (groupBy === 'sex') {
    const buckets = { male: [], female: [], other: [] };
    staff.forEach((s) => {
      const sx = (staffSex(s) || '').toLowerCase();
      (buckets[sx] || buckets.other).push(s);
    });
    return ['male', 'female', 'other']
      .filter((k) => buckets[k].length > 0)
      .map((k) => ({
        key: k,
        label: k === 'other' ? 'Other' : k[0].toUpperCase() + k.slice(1),
        sections: [{ key: k, label: null, staff: buckets[k] }],
      }));
  }

  if (groupBy === 'rank') {
    const buckets = {};
    staff.forEach((s) => {
      const key = s.staff_title || 'other';
      (buckets[key] ||= []).push(s);
    });
    return STAFF_TITLES
      .map((t) => t.value)
      .concat(Object.keys(buckets).filter((k) => !STAFF_TITLES.some((t) => t.value === k)))
      .filter((k) => buckets[k]?.length)
      .map((k) => ({
        key: k,
        label: getStaffTitleLabel(k),
        sections: [{ key: k, label: null, staff: buckets[k] }],
      }));
  }

  // Department (A→Z; "No department" last)
  const buckets = {};
  staff.forEach((s) => {
    const key = deptLabel(s) || 'No department';
    (buckets[key] ||= []).push(s);
  });
  return Object.keys(buckets)
    .sort((a, b) => {
      if (a === 'No department') return 1;
      if (b === 'No department') return -1;
      return a.localeCompare(b);
    })
    .map((key) => ({
      key,
      label: key,
      sections: [{ key, label: null, staff: buckets[key] }],
    }));
}

/** Canonical import template — matches the backend's expected CSV columns. */
export function downloadStaffTemplate() {
  const csv = 'Email,Title,First Name,Last Name,Staff Title,Sex\n'
    + 'juan.dela.cruz@knhs.edu.ph,Mr.,Juan,Dela Cruz,teacher_i,Male\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'knhs_staff_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
