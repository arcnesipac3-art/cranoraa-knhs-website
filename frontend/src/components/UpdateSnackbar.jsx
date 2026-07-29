import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';

/**
 * Snackbar that appears when a new version of the app is available.
 *
 * Shows at the bottom of the screen with a purple accent, matching
 * the InstallBanner and OfflineBanner design language.
 *
 * Features:
 *   - "Update Now" button triggers SW activation + page reload
 *   - Dismissable via close button (persists for the session only)
 *   - Slides in from the bottom with animation
 */
export default function UpdateSnackbar() {
  const { needsUpdate, applyUpdate, isUpdating } = useServiceWorkerUpdate();

  if (!needsUpdate) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 inset-x-0 z-[9998] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="max-w-lg mx-auto pointer-events-auto animate-fade-in-up">
        <div className="flex items-center gap-3 rounded-2xl bg-white border border-violet-100 shadow-2xl shadow-violet-900/15 p-4">
          {/* Pulse dot */}
          <div className="relative shrink-0">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-violet-400 animate-ping" />
          </div>

          {/* Message */}
          <p className="flex-1 text-sm font-bold text-slate-800">
            A new version is available
          </p>

          {/* Update Now button */}
          <button
            onClick={applyUpdate}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating…
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Update Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
