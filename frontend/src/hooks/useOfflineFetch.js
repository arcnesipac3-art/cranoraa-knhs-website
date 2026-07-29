import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import apiCache from '../utils/apiCache';

/**
 * Offline-aware data-fetching hook.
 *
 * Behavior:
 * - On mount, checks cache first. If cached data exists, serves it immediately.
 * - Then fetches from network. If successful, updates cache and state.
 * - If network fails and cached data exists, serves stale cache silently.
 * - If network fails and no cache, sets error.
 * - On reconnect (wasOffline → isOnline), automatically refetches.
 *
 * Usage:
 *   const { data, loading, error, isStale, refetch } = useOfflineFetch('/announcements/');
 *   const { data, loading, error, isStale } = useOfflineFetch('/dashboard/stats/', { ttl: 5 * 60 * 1000 });
 */
export function useOfflineFetch(url, options = {}) {
  const {
    params,
    deps = [],
    transform,
    immediate = true,
    ttl = 60 * 60 * 1000, // 1 hour default cache TTL
  } = options;

  const [data, setData] = useState(() => (url ? apiCache.get(url) : null));
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const cancelledRef = useRef(false);
  const cacheKeyRef = useRef(url);

  // Update cache key when params change
  useEffect(() => {
    cacheKeyRef.current = url
      ? `${url}${params ? '?' + new URLSearchParams(params).toString() : ''}`
      : null;
  }, [url, JSON.stringify(params)]);

  const fetchData = useCallback(
    async ({ forceNetwork = false } = {}) => {
      if (!url) return;
      const key = cacheKeyRef.current;
      cancelledRef.current = false;

      // 1. Serve from cache immediately (if available)
      if (!forceNetwork) {
        const cached = apiCache.get(key);
        if (cached) {
          setData(cached);
          setIsStale(false);
          setLoading(false);
        } else {
          // Check for stale data (expired but present)
          const stale = apiCache.getStale(key);
          if (stale) {
            setData(stale);
            setIsStale(true);
          }
        }
      }

      // 2. Fetch from network
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(url, { params });
        if (cancelledRef.current) return;

        const result = transform ? transform(res.data) : res.data;
        setData(result);
        setIsStale(false);

        // 3. Update cache
        if (key) {
          apiCache.set(key, result, ttl);
        }
      } catch (err) {
        if (cancelledRef.current) return;

        // Network failed — serve stale cache if available
        if (key) {
          const stale = apiCache.getStale(key);
          if (stale) {
            setData(stale);
            setIsStale(true);
            setError(null); // Clear error since we have fallback data
          } else {
            setError(err);
          }
        } else {
          setError(err);
        }
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    },
    [url, JSON.stringify(params), ttl, ...deps]
  );

  useEffect(() => {
    if (immediate) fetchData();
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchData, immediate]);

  return { data, loading, error, isStale, refetch: fetchData, setData };
}

/**
 * Parallel offline-aware fetch hook for multiple endpoints.
 *
 * Usage:
 *   const { data, loading, error, isStale } = useOfflineParallelFetch({
 *     stats: '/admin/stats/',
 *     metrics: '/admin/system-metrics/',
 *   });
 */
export function useOfflineParallelFetch(endpoints, options = {}) {
  const { deps = [], immediate = true, ttl = 60 * 60 * 1000 } = options;
  const [data, setData] = useState(() => {
    if (!endpoints) return {};
    const cached = {};
    let hasAny = false;
    for (const [key, url] of Object.entries(endpoints)) {
      const c = apiCache.get(url);
      if (c) {
        cached[key] = c;
        hasAny = true;
      }
    }
    return hasAny ? cached : {};
  });
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const cancelledRef = useRef(false);

  const fetchAll = useCallback(async () => {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    // 1. Serve cached data immediately
    if (endpoints) {
      const cached = {};
      let hasAny = false;
      let allStale = true;
      for (const [key, url] of Object.entries(endpoints)) {
        const c = apiCache.get(url);
        if (c) {
          cached[key] = c;
          hasAny = true;
          allStale = false;
        } else {
          const stale = apiCache.getStale(url);
          if (stale) {
            cached[key] = stale;
            hasAny = true;
          }
        }
      }
      if (hasAny) {
        setData(cached);
        setIsStale(allStale);
      }
    }

    // 2. Fetch from network
    try {
      if (!endpoints) {
        setData({});
        return;
      }

      const entries = Object.entries(endpoints);
      const results = await Promise.allSettled(
        entries.map(([, url]) => api.get(url))
      );

      if (cancelledRef.current) return;

      const merged = {};
      results.forEach((result, i) => {
        const key = entries[i][0];
        const url = entries[i][1];
        if (result.status === 'fulfilled') {
          merged[key] = result.value.data;
          apiCache.set(url, result.value.data, ttl);
        } else {
          // Keep cached value if available
          merged[key] = data[key] || null;
        }
      });

      setData(merged);
      setIsStale(false);
    } catch (err) {
      if (!cancelledRef.current) setError(err);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [JSON.stringify(endpoints), ttl, ...deps]);

  useEffect(() => {
    if (immediate) fetchAll();
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchAll, immediate]);

  return { data, loading, error, isStale, refetch: fetchAll, setData };
}
