import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../utils/api';

/**
 * Generic data-fetching hook.
 * 
 * Usage:
 *   const { data, loading, error, refetch } = useFetch('/subjects/');
 *   const { data, loading, error, refetch } = useFetch('/grades/', { params: { classroom: 1 } });
 *   const { data, loading, error, refetch } = useFetch('/subjects/', { deps: [classroomId] });
 */
export function useFetch(url, options = {}) {
  const { params, deps = [], transform, immediate = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const cancelledRef = useRef(false);
  // Memoize params to avoid re-creating fetchData on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const paramsKey = useMemo(() => JSON.stringify(params), [JSON.stringify(params)]);

  const fetchData = useCallback(async () => {
    if (!url) return;
    cancelledRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, { params });
      if (cancelledRef.current) return;
      const result = transform ? transform(res.data) : res.data;
      setData(result);
    } catch (err) {
      if (!cancelledRef.current) setError(err);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [url, paramsKey, ...deps]);

  useEffect(() => {
    if (immediate) fetchData();
    return () => { cancelledRef.current = true; };
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData, setData };
}

/**
 * Parallel fetch hook for multiple endpoints.
 * 
 * Usage:
 *   const { data, loading, error } = useParallelFetch({
 *     grades: '/grades/?academic_year=2025-2026',
 *     classrooms: '/classrooms/?academic_year=2025-2026',
 *   });
 *   // data.grades, data.classrooms
 */
export function useParallelFetch(endpoints, options = {}) {
  const { deps = [], immediate = true } = options;
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const cancelledRef = useRef(false);
  // Memoize endpoints key to avoid re-creating fetchAll on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const endpointsKey = useMemo(() => JSON.stringify(endpoints), [JSON.stringify(endpoints)]);

  const fetchAll = useCallback(async () => {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const entries = Object.entries(endpoints);
      const results = await Promise.allSettled(
        entries.map(([, url]) => api.get(url))
      );
      if (cancelledRef.current) return;
      const merged = {};
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          merged[entries[i][0]] = result.value.data;
        } else {
          merged[entries[i][0]] = null;
        }
      });
      setData(merged);
    } catch (err) {
      if (!cancelledRef.current) setError(err);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [endpointsKey, ...deps]);

  useEffect(() => {
    if (immediate) fetchAll();
    return () => { cancelledRef.current = true; };
  }, [fetchAll, immediate]);

  return { data, loading, error, refetch: fetchAll, setData };
}
