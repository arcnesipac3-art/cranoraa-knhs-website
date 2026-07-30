import { useState, useEffect, useCallback, useRef } from 'react';
import { getAll, putItems, getLastSynced, setLastSynced } from '../utils/offlineDb';

/**
 * Offline-aware data-fetching hook backed by IndexedDB.
 *
 * Behavior:
 * - On mount, reads from IndexedDB first. If cached data exists, serves it immediately.
 * - Then fetches from network. If successful, writes to IndexedDB and updates state.
 * - If network fails and cached data exists, serves stale data silently.
 * - If network fails and no cache, sets error.
 * - On reconnect (wasOffline → isOnline), automatically refetches.
 *
 * Usage:
 *   const { data, loading, error, isStale, refetch } = useOfflineFetch('announcements', '/announcements/');
 *   const { data, loading, error, isStale } = useOfflineFetch('grades', '/grades/my_grades/', { ttl: 5 * 60 * 1000 });
 */
export function useOfflineFetch(storeName, url, options = {}) {
  const {
    params,
    deps = [],
    transform,
    immediate = true,
    ttl = 60 * 60 * 1000, // 1 hour default cache TTL
  } = options;

  const [data, setData] = useState(null);
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
      if (!url || !storeName) return;
      cancelledRef.current = false;

      // 1. Serve from IndexedDB immediately (if available)
      if (!forceNetwork) {
        try {
          const cached = await getAll(storeName);
          if (cancelledRef.current) return;

          if (cached && cached.length > 0) {
            const sorted = cached.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            setData(sorted);
            setIsStale(false);
            setLoading(false);

            // Check staleness based on last sync time
            const lastSynced = await getLastSynced(storeName);
            if (lastSynced) {
              const age = Date.now() - lastSynced;
              if (age > ttl) {
                setIsStale(true);
              }
            }
          }
        } catch {
          // IndexedDB read failed — continue to network
        }
      }

      // 2. Fetch from network
      setLoading(true);
      setError(null);

      try {
        const { default: api } = await import('../utils/api.js');
        const res = await api.get(url, { params });
        if (cancelledRef.current) return;

        const result = transform ? transform(res.data) : res.data;
        setData(result);
        setIsStale(false);

        // 3. Write to IndexedDB
        try {
          const items = Array.isArray(result) ? result : result?.results || [result].filter(Boolean);
          if (items.length > 0) {
            await putItems(storeName, items);
            await setLastSynced(storeName, Date.now());
          }
        } catch {
          // IndexedDB write failed — data is still in memory
        }
      } catch (err) {
        if (cancelledRef.current) return;

        // Network failed — try to serve stale IndexedDB data
        try {
          const cached = await getAll(storeName);
          if (cached && cached.length > 0) {
            const sorted = cached.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            setData(sorted);
            setIsStale(true);
            setError(null); // Clear error since we have fallback data
          } else {
            setError(err);
          }
        } catch {
          setError(err);
        }
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    },
    [url, storeName, ttl, JSON.stringify(params), ...deps]
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
 * All data is cached in IndexedDB under their respective store names.
 *
 * Usage:
 *   const { data, loading, error, isStale } = useOfflineParallelFetch({
 *     stats: { store: 'grades', url: '/grades/summary/' },
 *     subjects: { store: 'subjects', url: '/subjects/' },
 *   });
 */
export function useOfflineParallelFetch(endpoints, options = {}) {
  const { deps = [], immediate = true, ttl = 60 * 60 * 1000 } = options;
  const [data, setData] = useState(() => ({}));
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const cancelledRef = useRef(false);

  const fetchAll = useCallback(async () => {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    // 1. Serve cached data from IndexedDB immediately
    if (endpoints) {
      const cached = {};
      let hasAny = false;
      for (const [key, config] of Object.entries(endpoints)) {
        try {
          const storeName = typeof config === 'string' ? config : config.store;
          const items = await getAll(storeName);
          if (items && items.length > 0) {
            const sorted = items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            cached[key] = sorted;
            hasAny = true;
          }
        } catch {
          // IndexedDB read failed for this store
        }
      }
      if (hasAny) {
        setData(cached);
        setIsStale(true); // Assume stale until network confirms
      }
    }

    // 2. Fetch from network
    try {
      if (!endpoints) {
        setData({});
        return;
      }

      const { default: api } = await import('../utils/api.js');
      const entries = Object.entries(endpoints);
      const results = await Promise.allSettled(
        entries.map(([, config]) => {
          const url = typeof config === 'string' ? null : config.url;
          return api.get(url);
        })
      );

      if (cancelledRef.current) return;

      const merged = {};
      let anySuccess = false;
      results.forEach((result, i) => {
        const key = entries[i][0];
        const config = entries[i][1];
        const storeName = typeof config === 'string' ? config : config.store;

        if (result.status === 'fulfilled') {
          merged[key] = result.value.data;
          anySuccess = true;

          // Write to IndexedDB
          try {
            const data = result.value.data;
            const items = Array.isArray(data) ? data : data?.results || [data].filter(Boolean);
            if (items.length > 0) {
              putItems(storeName, items).catch(() => {});
              setLastSynced(storeName, Date.now()).catch(() => {});
            }
          } catch {
            // Non-critical
          }
        } else {
          // Keep cached value if available
          merged[key] = data[key] || null;
        }
      });

      setData(merged);
      setIsStale(!anySuccess);
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
