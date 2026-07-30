import { useState, useEffect, useCallback } from 'react';
import { getPendingSyncCount } from '../utils/syncEngine';

/**
 * Hook that exposes the current sync queue status.
 * Useful for showing pending changes count in the UI.
 *
 * Usage:
 *   const { pendingCount, isSyncing, refresh } = useSyncStatus();
 */
export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available
    }
  }, []);

  // Poll pending count on mount and when events fire
  useEffect(() => {
    refresh();

    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncEnd = () => {
      setIsSyncing(false);
      refresh();
    };

    window.addEventListener('sync:start', handleSyncStart);
    window.addEventListener('sync:end', handleSyncEnd);
    window.addEventListener('backend:reachable', refresh);
    window.addEventListener('online', () => setTimeout(refresh, 3000));

    const interval = setInterval(refresh, 30000);

    return () => {
      window.removeEventListener('sync:start', handleSyncStart);
      window.removeEventListener('sync:end', handleSyncEnd);
      window.removeEventListener('backend:reachable', refresh);
      clearInterval(interval);
    };
  }, [refresh]);

  return { pendingCount, isSyncing, refresh };
}
