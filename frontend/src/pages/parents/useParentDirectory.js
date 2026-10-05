/**
 * useParentDirectory — single source of truth for the Parent directory.
 *
 * URL-driven (deep-linkable), server-queried (filters/sort/pagination).
 * View state keys: q, account, children, date_from, date_to, page, size,
 * ordering, group — plus `parent` for the open profile.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { useDebouncedValue } from '../students/directoryHelpers';

const DEFAULTS = {
  q: '', account: '', children: '',
  date_from: '', date_to: '',
  page: '1', size: '25', ordering: 'last_name', group: 'none',
};

const FILTER_KEYS = ['q', 'account', 'children', 'date_from', 'date_to'];

export function useParentDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();

  const get = useCallback(
    (k) => (searchParams.has(k) ? searchParams.get(k) : DEFAULTS[k]),
    [searchParams],
  );

  const setParam = useCallback((key, value, { keepPage = false } = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === DEFAULTS[key]) next.delete(key);
      else next.set(key, String(value));
      if (!keepPage && key !== 'page') next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      FILTER_KEYS.forEach((k) => next.delete(k));
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const q = get('q');
  const debouncedQ = useDebouncedValue(q, 300);

  const [list, setList] = useState({ parents: [], count: 0, loading: true, fetching: false, error: null });
  const [meta, setMeta] = useState({ stats: null, students: [], loading: true, error: null });
  const [selectedIds, setSelectedIds] = useState([]);
  const [nonce, setNonce] = useState(0);
  const bootedRef = useRef(false);

  const listParams = useMemo(() => {
    const p = {
      role: 'parent',
      include_inactive: '1',
      page: get('page'), page_size: get('size'), ordering: get('ordering'),
    };
    if (debouncedQ) p.search = debouncedQ;
    const map = { account: 'account_status', children: 'has_children', date_from: 'date_from', date_to: 'date_to' };
    Object.entries(map).forEach(([key, param]) => { if (get(key)) p[param] = get(key); });
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), debouncedQ]);

  const queryKey = useMemo(() => JSON.stringify(listParams), [listParams]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    const isBoot = !bootedRef.current;
    setList((prev) => ({ ...prev, loading: isBoot, fetching: !isBoot, error: null }));
    api.get('/users/', { params: listParams, signal: ctrl.signal })
      .then((res) => {
        const data = res.data;
        setList({
          parents: Array.isArray(data) ? data : (data.results || []),
          count: Array.isArray(data) ? data.length : (data.count || 0),
          loading: false, fetching: false, error: null,
        });
        bootedRef.current = true;
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setList((prev) => ({ ...prev, loading: false, fetching: false, error: err }));
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, nonce]);

  // Stats + the student list the "Link Children" picker needs.
  useEffect(() => {
    const ctrl = new AbortController();
    setMeta((prev) => ({ ...prev, loading: true, error: null }));
    Promise.all([
      api.get('/users/parent_stats/', { params: { role: 'parent', include_inactive: '1' }, signal: ctrl.signal }),
      fetchAllStudents(ctrl.signal),
    ])
      .then(([statsRes, students]) => {
        setMeta({ stats: statsRes.data, students, loading: false, error: null });
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setMeta((prev) => ({ ...prev, loading: false, error: err }));
      });
    return () => ctrl.abort();
  }, [nonce]);

  const isSelected = useCallback((id) => selectedIds.includes(id), [selectedIds]);
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const setManySelected = useCallback((ids, on) => {
    setSelectedIds((prev) => (on
      ? [...new Set([...prev, ...ids])]
      : prev.filter((id) => !ids.includes(id))));
  }, []);
  const clearSelection = useCallback(() => setSelectedIds([]), []);

  /** Every row matching the current filters, paged through the server. */
  const fetchAllMatching = useCallback(async (extra = {}) => {
    const out = [];
    for (let page = 1; page <= 40; page++) {
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
    () => FILTER_KEYS.filter((k) => !!get(k)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.toString()],
  );

  return {
    get, setParam, clearFilters, activeFilterCount,
    ...list,
    students: meta.students,
    stats: meta.stats,
    metaLoading: meta.loading,
    metaError: meta.error,
    pageSize, page, refetch,
    selectedIds, isSelected, toggleSelect, setManySelected, clearSelection,
    fetchAllMatching,
  };
}

/** Page through the student directory (bounded) for the child-link picker. */
async function fetchAllStudents(signal) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const res = await api.get('/users/', {
      params: { role: 'student', page: String(page), page_size: '500', ordering: 'last_name' },
      signal,
    });
    const data = res.data;
    const rows = Array.isArray(data) ? data : (data.results || []);
    out.push(...rows);
    const count = Array.isArray(data) ? out.length : (data.count || 0);
    if (out.length >= count) break;
  }
  return out;
}

export default useParentDirectory;
