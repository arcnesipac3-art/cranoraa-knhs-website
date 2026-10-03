import { useEffect, useState } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Persistent banner shown when the user is offline.
 * Also shows a brief "back online" confirmation when reconnected.
 */
const OfflineBanner = () => {
  const { isOnline, wasOffline, clearWasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true);
      clearWasOffline();
      const t = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline, clearWasOffline]);

  if (isOnline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 rounded-lg bg-green-600 px-5 py-3 text-white shadow-2xl shadow-green-900/30 animate-fade-in-up"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-bold">Back online — syncing data…</span>
      </div>
    );
  }

  // Offline state
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2.5 bg-amber-500 px-4 py-2.5 text-white shadow-lg"
    >
      <svg className="w-4 h-4 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
      </svg>
      <span className="text-sm font-bold">You are offline</span>
      <span className="hidden sm:inline text-xs font-medium opacity-80">— Changes will sync when connection returns</span>
    </div>
  );
};

export default OfflineBanner;
