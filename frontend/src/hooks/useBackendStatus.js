import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

/**
 * Tracks backend reachability.
 *
 * Detects when the backend is unreachable by monitoring consecutive
 * API failures. After N consecutive failures, marks backend as down.
 * When a request succeeds, resets the counter.
 *
 * Also listens for the custom 'backend:unreachable' event dispatched
 * by the axios interceptor in api.js.
 *
 * Usage:
 *   const { isReachable, consecutiveFailures, lastChecked } = useBackendStatus();
 */
export function useBackendStatus() {
  const [isReachable, setIsReachable] = useState(true);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastChecked, setLastChecked] = useState(null);
  const failureCountRef = useRef(0);
  const THRESHOLD = 3; // Consecutive failures before marking as down

  useEffect(() => {
    const handleReachable = () => {
      failureCountRef.current = 0;
      setConsecutiveFailures(0);
      setIsReachable(true);
      setLastChecked(Date.now());
    };

    const handleUnreachable = (event) => {
      const count = event.detail?.failureCount || failureCountRef.current;
      failureCountRef.current = count;
      setConsecutiveFailures(count);
      setLastChecked(Date.now());
      if (count >= THRESHOLD) {
        setIsReachable(false);
      }
    };

    window.addEventListener('backend:reachable', handleReachable);
    window.addEventListener('backend:unreachable', handleUnreachable);

    return () => {
      window.removeEventListener('backend:reachable', handleReachable);
      window.removeEventListener('backend:unreachable', handleUnreachable);
    };
  }, []);

  /**
   * Manually probe the backend to check reachability.
   * @returns {Promise<boolean>}
   */
  const probe = useCallback(async () => {
    try {
      const res = await api.get('/system/maintenance-status/', {
        timeout: 5000,
      });
      if (res.status === 200) {
        failureCountRef.current = 0;
        setConsecutiveFailures(0);
        setIsReachable(true);
        setLastChecked(Date.now());
        return true;
      }
    } catch {
      failureCountRef.current++;
      setConsecutiveFailures(failureCountRef.current);
      setLastChecked(Date.now());
      if (failureCountRef.current >= THRESHOLD) {
        setIsReachable(false);
      }
    }
    return false;
  }, []);

  return { isReachable, consecutiveFailures, lastChecked, probe };
}

/**
 * Hook that returns true when the app detects it's in an
 * "offline mode" — either browser offline or backend unreachable.
 *
 * Usage:
 *   const { isOfflineMode } = useOfflineMode();
 */
export function useOfflineMode() {
  const [isBrowserOffline, setIsBrowserOffline] = useState(!navigator.onLine);
  const { isReachable } = useBackendStatus();

  useEffect(() => {
    const handleOnline = () => setIsBrowserOffline(false);
    const handleOffline = () => setIsBrowserOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOfflineMode: isBrowserOffline || !isReachable,
    isBrowserOffline,
    isBackendDown: !isReachable,
  };
}
