import { useState, useEffect, useCallback, useRef } from 'react';
import { getAll, putItems, getLastSynced, setLastSynced } from '../utils/offlineDb';

/**
 * Offline-aware data-fetching hook backed by IndexedDB.
 *
 * Behavior:
 * 1. On mount, reads from IndexedDB → serves immediately if data exists
 * 2. Fetches from network via api.get()
 * 3. On success: writes to IndexedDB, updates state
 * 4. On network failure: keeps serving cached data; sets error only if no cache
 * 5. On backend:reachable / online events: auto-refetches
 *
 * Usage:
 *   const { data, isLoading, isStale, error, refetch } = useOfflineQuery(
 *     'announcements',
 *     '/announcements/',
 *     { params: { status: 'live' }, staleTime: 5 * 60 * 1000 }
 *   );
 */
export function useOfflineQuery(storeName, url, options = {}) {
  const {
    params,
    transform,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    deps = [],
  } = options;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const cancelledRef = useRef(false);
  const urlRef = useRef(url);
  const paramsRef = useRef(params);

  // Build cache key from URL + params
  const cacheKey = url
    ? `${url}${params ? '?' + new URLSearchParams(params).toString() : ''}`
    : null;

  useEffect(() => {
    urlRef.current = url;
    paramsRef.current = params;
  }, [url, JSON.stringify(params)]);

  const fetchData = useCallback(
    async ({ forceNetwork = false } = {}) => {
      if (!url || !enabled || !storeName) return;
      cancelledRef.current = false;

      setIsFetching(true);
      setError(null);

      try {
        // 1. Read from IndexedDB immediately
        if (!forceNetwork) {
          try {
            const cached = await getAll(storeName);
            if (cancelledRef.current) return;

            if (cached && cached.length > 0) {
              // Sort by updatedAt descending, serve the collection
              const sorted = cached.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
              setData(sorted);
              setIsLoading(false);
              setIsSuccess(true);

              // Check staleness
              const lastSynced = await getLastSynced(storeName);
              const age = lastSynced ? Date.now() - lastSynced : Infinity;
              setIsStale(age > staleTime);
            }
          } catch {
            // IndexedDB read failed — continue to network
          }
        }

        // 2. Fetch from network
        const { default: api } = await import('../utils/api.js');
        const res = await api.get(url, { params: paramsRef.current });

        if (cancelledRef.current) return;

        const result = transform ? transform(res.data) : res.data;

        // Normalize to array for consistent IndexedDB storage
        const items = Array.isArray(result) ? result : result?.results || [result].filter(Boolean);

        setData(items);
        setIsStale(false);
        setIsSuccess(true);
        setError(null);

        // 3. Write to IndexedDB
        try {
          await putItems(storeName, items);
          await setLastSynced(storeName, Date.now());
        } catch {
          // IndexedDB write failed — data is still in memory
        }
      } catch (err) {
        if (cancelledRef.current) return;

        // Network failed — try to serve stale data
        try {
          const cached = await getAll(storeName);
          if (cached && cached.length > 0) {
            const sorted = cached.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            setData(sorted);
            setIsStale(true);
            setIsSuccess(true);
            setError(null); // Clear error since we have fallback data
          } else {
            setError(err);
          }
        } catch {
          setError(err);
        }
      } finally {
        if (!cancelledRef.current) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    [url, storeName, staleTime, transform, enabled, ...deps]
  );

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchData, enabled]);

  // Refetch on reconnect
  useEffect(() => {
    if (!enabled) return;

    const handleReconnect = () => {
      // Delay to let backend stabilize
      setTimeout(() => fetchData({ forceNetwork: true }), 2000);
    };

    window.addEventListener('backend:reachable', handleReconnect);
    window.addEventListener('online', handleReconnect);

    return () => {
      window.removeEventListener('backend:reachable', handleReconnect);
      window.removeEventListener('online', handleReconnect);
    };
  }, [fetchData, enabled]);

  return {
    data,
    isLoading,
    isFetching,
    isStale,
    error,
    refetch: fetchData,
    isSuccess,
  };
}
