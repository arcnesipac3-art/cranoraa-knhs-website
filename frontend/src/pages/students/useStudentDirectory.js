/**
 * useStudentDirectory — single source of truth for the Students directory.
 *
 * Every view-affecting value lives in the URL (deep-linkable, back/forward
 * friendly): q, grade, section, status, sex, account, date_from, date_to,
 * page, size, ordering, group, student. All list querying is server-side
 * (search/filters/sort/pagination) so large directories never load wholesale.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useDebouncedValue } from './directoryHelpers';

const DEFAULTS = {
  q: '', grade: '', section: '', status: '', sex: '', account: '',
  date_from: '', date_to: '', page: '1', size: '25',
  ordering: 'last_name', group: 'grade', student: '',
};

export function useStudentDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { academicYear, academicYears } = useAcademicYear();

  const get = useCallback(
    (k) => (searchParams.has(k) ? searchParams.get(k) : DEFAULTS[k]),
    [searchParams],
  );

  const setParam = useCallback((key, value, { keepPage = false } = {}) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!value || value === DEFAULTS[key]) next.delete(key);
      else next.set(key, String(value));
      if (!keepPage && key !== 'page') next.delete('page'); // filter change → page 1
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      ['q', 'grade', 'section', 'status', 'sex', 'account', 'date_from', 'date_to']
        .forEach(k => next.delete(k));
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Debounced search text → URL
  const q = get('q');
  const debouncedQ = useDebouncedValue(q, 300);

  // The academic year shown in the header (shared app context) scopes the
  // directory: resolve the selected year's id for the backend.
  const ayId = useMemo(() => {
    const hit = (academicYears || []).find(y => y.name === academicYear);
    return hit ? String(hit.id) : '';
  }, [academicYears, academicYear]);

  // ── List state ────────────────────────────────────────────────────────────
  const [list, setList] = useState({ students: [], count: 0, loading: true, fetching: false, error: null });
  const [meta, setMeta] = useState({ stats: null, classrooms: [], loading: true, error: null });
  const [selectedIds, setSelectedIds] = useState([]);
  const [nonce, setNonce] = useState(0);
  const bootedRef = useRef(false);

  const listParams = useMemo(() => {
    const p = { role: 'student', page: get('page'), page_size: get('size'), ordering: get('ordering') };
    if (debouncedQ) p.search = debouncedQ;
    const map = { grade: 'grade', section: 'section', status: 'status', sex: 'sex', account: 'account_status', date_from: 'date_from', date_to: 'date_to' };
    Object.entries(map).forEach(([key, param]) => { if (get(key)) p[param] = get(key); });
    if (ayId) p.academic_year = ayId;
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), debouncedQ, ayId]);

  const statsParams = useMemo(() => (ayId ? { academic_year: ayId } : {}), [ayId]);
  const queryKey = useMemo(
    () => JSON.stringify(listParams) + '|' + debouncedQ + '|' + ayId,
    [listParams, debouncedQ, ayId],
  );

  const refetch = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    const isBoot = !bootedRef.current;
    setList(prev => ({
      ...prev,
      loading: isBoot,
      fetching: !isBoot,
      error: null,
    }));
    api.get('/users/', { params: listParams, signal: ctrl.signal })
      .then((res) => {
        const data = res.data;
        setList({
          students: Array.isArray(data) ? data : (data.results || []),
          count: Array.isArray(data) ? data.length : (data.count || 0),
          loading: false, fetching: false, error: null,
        });
        bootedRef.current = true;
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setList(prev => ({ ...prev, loading: false, fetching: false, error: err }));
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, nonce]);

  // Summary cards + classrooms (only depend on the academic year).
  useEffect(() => {
    const ctrl = new AbortController();
    setMeta(prev => ({ ...prev, loading: true, error: null }));
    Promise.all([
      api.get('/users/student_stats/', { params: statsParams, signal: ctrl.signal }),
      api.get('/classrooms/', { signal: ctrl.signal }),
    ])
      .then(([statsRes, clsRes]) => {
        const cls = clsRes.data;
        setMeta({
          stats: statsRes.data,
          classrooms: Array.isArray(cls) ? cls : (cls.results || []),
          loading: false, error: null,
        });
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setMeta(prev => ({ ...prev, loading: false, error: err }));
      });
    return () => ctrl.abort();
  }, [statsParams, nonce]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const isSelected = useCallback(id => selectedIds.includes(id), [selectedIds]);
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, []);
  const setManySelected = useCallback((ids, on) => {
    setSelectedIds(prev => on
      ? [...new Set([...prev, ...ids])]
      : prev.filter(id => !ids.includes(id)));
  }, []);
  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── Server actions (authorization stays on the backend) ───────────────────
  const changeStudentStatus = useCallback(
    (student, status, reason) =>
      api.post(`/users/${student.id}/update-enrollment-status/`, { status, reason }),
    [],
  );
  const bulkChangeStatus = useCallback(
    (ids, status, reason) =>
      api.post('/users/bulk-update-enrollment-status/', { user_ids: ids, status, reason }),
    [],
  );
  const bulkAssignSection = useCallback(
    (ids, classroomId) =>
      api.post('/users/bulk-assign-section/', { user_ids: ids, classroom_id: classroomId }),
    [],
  );

  /** Page through the server honoring the active filters (for exports). */
  const fetchAllMatching = useCallback(async (extra = {}) => {
    const out = [];
    let page = 1;
    // Bounded: 500 per page, hard cap 40 pages (20k rows) as a safety net.
    for (; page <= 40; page++) {
      const res = await api.get('/users/', {
        params: { ...listParams, ...extra, page: String(page), page_size: '500' },
      });
      const data = res.data;
      const rows = Array.isArray(data) ? data : (data.results || []);
      out.push(...rows);
      const count = Array.isArray(data) ? out.length : (data.count || 0);
      if (out.length >= count) break;
    }
    return out;
  }, [listParams]);

  const pageSize = parseInt(get('size'), 10) || 25;
  const page = parseInt(get('page'), 10) || 1;

  const activeFilterCount = useMemo(
    () => ['q', 'grade', 'section', 'status', 'sex', 'account', 'date_from', 'date_to']
      .filter(k => !!get(k)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.toString()],
  );

  return {
    // URL state
    get, setParam, clearFilters, activeFilterCount,
    // data
    ...list, stats: meta.stats, classrooms: meta.classrooms,
    metaLoading: meta.loading, metaError: meta.error,
    pageSize, page, refetch, ayId,
    // selection
    selectedIds, isSelected, toggleSelect, setManySelected, clearSelection,
    // actions
    changeStudentStatus, bulkChangeStatus, bulkAssignSection, fetchAllMatching,
  };
}

export default useStudentDirectory;
