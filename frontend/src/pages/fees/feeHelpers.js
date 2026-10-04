import { api } from '../../utils/api';

// ── Formatting ────────────────────────────────────────────────────────────────
export const peso = (n) =>
  `₱${(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const statusBadge = (status) => {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'partial':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'unpaid':
    default:
      return 'bg-rose-100 text-rose-700 border border-rose-200';
  }
};

export const statusLabel = (status) => {
  if (status === 'partial') return 'Partially Paid';
  if (status === 'paid') return 'Paid';
  return 'Unpaid';
};

export const studentName = (s) =>
  s?.full_name || `${s?.first_name || ''} ${s?.last_name || ''}`.trim() || s?.username || 'Unknown';

export const gradeLabel = (g) => (/^\d+$/.test(String(g)) ? `Grade ${g}` : String(g || ''));

export const termLabel = (t) => (t ? `Term ${t}` : '—');

export const feeTypeName = (fee) => fee?.fee_type_name || 'Fee';

// Local calendar date (not UTC) so the default payment date matches what the
// user sees in the date input.
export const todayISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(String(value).slice(0, 10));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-PH');
};

// Mirrors the backend Payment.METHOD_CHOICES exactly.
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

export const TERMS = [
  { value: 1, label: 'Term 1' },
  { value: 2, label: 'Term 2' },
  { value: 3, label: 'Term 3' },
];

export const methodLabel = (value) =>
  PAYMENT_METHODS.find((m) => m.value === value)?.label || value || '—';

// ── Fetchers ──────────────────────────────────────────────────────────────────
// The backend pages at 50 rows (PageNumberPagination, no page_size override)
// and returns { results, next, ... } — page through explicitly until exhausted.
async function fetchPaged(url, params = {}, maxPages = 40) {
  const all = [];
  const seen = new Set();
  for (let page = 1; page <= maxPages; page += 1) {
    const { data } = await api.get(url, { params: { ...params, page } });
    const batch = Array.isArray(data) ? data : data?.results || [];
    for (const row of batch) {
      if (row && typeof row === 'object' && row.id != null && !seen.has(row.id)) {
        seen.add(row.id);
        all.push(row);
      }
    }
    if (Array.isArray(data) || !data?.next || batch.length === 0) break;
  }
  return all;
}

/** All charges for a school year (name), oldest-newest pages collected whole. */
export async function fetchAllFees(academicYear) {
  const params = {};
  if (academicYear) params.academic_year = academicYear;
  return fetchPaged('/fees/', params);
}

/** School-wide payment history (role-scoped by the backend) for one SY. */
export async function fetchAllPayments(academicYear) {
  const params = {};
  if (academicYear) params.academic_year = academicYear;
  return fetchPaged('/fees/payments/', params);
}

/** Fee type catalog (small — 10 pages of 50 is far beyond any real catalog). */
export async function fetchAllFeeTypes() {
  return fetchPaged('/fee-types/', {}, 10);
}

// The /users/ endpoint pages 50 at a time (a `limit` param is silently
// ignored), so page through explicitly. Admin accounts also get every
// approved user back for `?role=student`, so keep only real students
// client-side.
export async function fetchAllStudents() {
  const all = [];
  const seen = new Set();
  const MAX_PAGES = 40; // 40 x 50 = 2000 users; safety cap
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await api.get('/users/', { params: { role: 'student', page } });
    const batch = Array.isArray(data) ? data : data?.results || [];
    for (const u of batch) {
      if (!u || u.role !== 'student' || seen.has(u.id)) continue;
      seen.add(u.id);
      all.push(u);
    }
    if (Array.isArray(data) || !data?.next || batch.length === 0) break;
  }
  return all.sort((a, b) => studentName(a).localeCompare(studentName(b)));
}
