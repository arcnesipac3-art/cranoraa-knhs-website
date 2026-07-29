import { useEffect, useState } from 'react';
import backgroundSync from '../utils/backgroundSync';

export default function Offline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backendDown, setBackendDown] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBackendDown = () => setBackendDown(true);
    const handleBackendUp = () => setBackendDown(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('backend:unreachable', handleBackendDown);
    window.addEventListener('backend:reachable', handleBackendUp);

    // Check initial backend status
    setBackendDown(!navigator.onLine);
    setPendingSync(backgroundSync.length());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('backend:unreachable', handleBackendDown);
      window.removeEventListener('backend:reachable', handleBackendUp);
    };
  }, []);

  useEffect(() => {
    if (isOnline && !backendDown) {
      window.location.reload();
    }
  }, [isOnline, backendDown]);

  const isBrowserOffline = !navigator.onLine;
  const reason = isBrowserOffline
    ? 'Your device is not connected to the internet.'
    : 'The server is temporarily unreachable.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isBrowserOffline ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            )}
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {isBrowserOffline ? 'You are offline' : 'Server unreachable'}
        </h1>
        <p className="text-slate-500 text-sm mb-4 leading-relaxed">
          {reason} Cached data is displayed where available and will update
          automatically when the connection is restored.
        </p>

        {pendingSync > 0 && (
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {pendingSync} change{pendingSync !== 1 ? 's' : ''} waiting to sync
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
