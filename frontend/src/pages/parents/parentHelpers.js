/**
 * Pure helpers for the Parent directory.
 * No data fetching lives here.
 */
import { accountStatus, formatDate } from '../students/directoryHelpers';

export { accountStatus, formatDate };

export const parentName = (p) =>
  `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || p?.username || 'Unnamed';

export const parentInitials = (p) =>
  ((p?.first_name || '?')[0] + (p?.last_name || p?.first_name || '')[0]).toUpperCase();

/** Normalized list of linked children (backend stores ids or objects). */
export function parentChildren(p) {
  const raw = p?.profile?.linked_students || [];
  return raw.map((s) => (typeof s === 'object' && s !== null ? s : { id: s }));
}

export const childName = (c) =>
  (c.first_name || c.last_name) ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : `Student #${c.id}`;

// ── Columns (customizable, persisted) ───────────────────────────────────────
export const PARENT_COLUMNS = [
  { id: 'children', label: 'Linked Children', defaultOn: true },
  { id: 'contact', label: 'Contact', defaultOn: true },
  { id: 'account', label: 'Account', defaultOn: true },
  { id: 'password', label: 'Password', defaultOn: false },
  { id: 'date_joined', label: 'Date Joined', defaultOn: false },
];

const COLUMNS_KEY = 'knhs_parent_directory_columns';

export function loadParentColumnPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMNS_KEY) || '{}');
    const prefs = {};
    PARENT_COLUMNS.forEach((c) => { prefs[c.id] = typeof raw[c.id] === 'boolean' ? raw[c.id] : c.defaultOn; });
    return prefs;
  } catch {
    const prefs = {};
    PARENT_COLUMNS.forEach((c) => { prefs[c.id] = c.defaultOn; });
    return prefs;
  }
}

export function saveParentColumnPrefs(prefs) {
  try { localStorage.setItem(COLUMNS_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
}

// ── Server-side sortable headers (must match backend ordering_fields) ───────
export const PARENT_SORTERS = {
  parent: { field: 'last_name', label: 'Parent Name' },
  account: { field: 'account_status', label: 'Account' },
  date_joined: { field: 'date_joined', label: 'Date Joined' },
};

// ── Grouping ────────────────────────────────────────────────────────────────
export const PARENT_GROUP_OPTIONS = [
  { value: 'children', label: 'Linked Children' },
  { value: 'account', label: 'Account Status' },
  { value: 'none', label: 'No grouping' },
];

export function buildParentGroups(parents, groupBy) {
  if (groupBy === 'none') {
    return [{ key: 'all', label: null, sections: [{ key: 'all', label: null, parents }] }];
  }

  if (groupBy === 'account') {
    const buckets = {};
    parents.forEach((p) => {
      const key = p.account_status || 'unknown';
      (buckets[key] ||= []).push(p);
    });
    return ['active', 'inactive', 'suspended', 'pending_reset', 'unknown']
      .filter((k) => buckets[k]?.length)
      .map((k) => ({
        key: k,
        label: accountStatus(k === 'unknown' ? null : k).label,
        sections: [{ key: k, label: null, parents: buckets[k] }],
      }));
  }

  // Linked children
  const linked = parents.filter((p) => parentChildren(p).length > 0);
  const unlinked = parents.filter((p) => parentChildren(p).length === 0);
  const groups = [];
  if (linked.length) {
    groups.push({ key: 'linked', label: 'With linked children', sections: [{ key: 'linked', label: null, parents: linked }] });
  }
  if (unlinked.length) {
    groups.push({ key: 'unlinked', label: 'Not yet linked', sections: [{ key: 'unlinked', label: null, parents: unlinked }] });
  }
  return groups;
}

/** Canonical import template — matches the backend's expected CSV columns. */
export function downloadParentTemplate() {
  const csv = 'Email,First Name,Last Name,Password\n'
    + 'maria.dela.cruz@email.com,Maria,Dela Cruz,\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'knhs_parent_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
