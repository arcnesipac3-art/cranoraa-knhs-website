import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

const ServiceWorkerUpdateContext = createContext(null);

/**
 * Provides service worker update detection and control.
 *
 * Wraps vite-plugin-pwa's `registerSW` and exposes:
 *   - `needsUpdate` — true when a new SW is waiting
 *   - `applyUpdate()` — tells the waiting SW to take over and reloads
 *   - `isUpdating` — true while the update is being applied
 *
 * Usage:
 *   const { needsUpdate, applyUpdate } = useServiceWorkerUpdate();
 */
export function useServiceWorkerUpdate() {
  const ctx = useContext(ServiceWorkerUpdateContext);
  if (!ctx) throw new Error('useServiceWorkerUpdate must be used within ServiceProviderUpdate');
  return ctx;
}

/**
 * Provider that initializes SW registration and exposes update state.
 * Render this once at the app root (in main.jsx).
 */
export function ServiceProviderUpdate({ children }) {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [swUpdateFn, setSwUpdateFn] = useState(null);

  // Initialize SW registration — store the update function and listen for updates
  useEffect(() => {
    const updateSW = registerSW({
      immediate: false,
      onRegisteredSW(_swUrl, registration) {
        if (import.meta.env.PROD && registration) {
          // Check for updates every hour
          setInterval(() => registration.update(), 60 * 60 * 1000);

          // Also check when the tab regains focus
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update();
            }
          });
        }
      },
      onOfflineReady() {
        // Handled by existing OfflineBanner / Swal in main.jsx
      },
      onNeedRefresh() {
        setNeedsUpdate(true);
      },
      onRegistrationError(error) {
        console.error('Service worker registration failed:', error);
      },
    });

    setSwUpdateFn(() => updateSW);
  }, []);

  const applyUpdate = useCallback(async () => {
    if (!swUpdateFn || isUpdating) return;
    setIsUpdating(true);
    try {
      await swUpdateFn();
      // Page reloads automatically after SW takes over
    } catch (err) {
      console.error('Failed to apply SW update:', err);
      setIsUpdating(false);
    }
  }, [swUpdateFn, isUpdating]);

  const value = { needsUpdate, applyUpdate, isUpdating };

  return (
    <ServiceWorkerUpdateContext.Provider value={value}>
      {children}
    </ServiceWorkerUpdateContext.Provider>
  );
}
