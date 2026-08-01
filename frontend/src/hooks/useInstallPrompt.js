import { useState, useEffect, useCallback } from 'react';

const DISMISS_KEY = 'knhs_install_dismissed';
const DISMISSED_PERMANENTLY = 'permanent';

/**
 * Custom hook to capture and manage the PWA install prompt.
 *
 * Detects when the browser fires `beforeinstallprompt` (meaning the app
 * is installable) and provides methods to trigger the prompt or dismiss it.
 *
 * Persists the user's "Never Show Again" choice in localStorage.
 *
 * Usage:
 *   const { canInstall, isInstalled, install, dismiss, isDismissed } = useInstallPrompt();
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    const val = localStorage.getItem(DISMISS_KEY);
    return val === DISMISSED_PERMANENTLY;
  });

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      // Clear dismiss flag since it's now installed
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Trigger the browser install prompt.
   * Returns { outcome: 'accepted' | 'dismissed' } or null if not available.
   */
  const install = useCallback(async () => {
    if (!deferredPrompt) return null;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    return { outcome };
  }, [deferredPrompt]);

  /**
   * Dismiss the install prompt.
   * @param {boolean} permanently - If true, never show again.
   */
  const dismiss = useCallback((permanently = false) => {
    setDeferredPrompt(null);
    setIsDismissed(true);
    if (permanently) {
      localStorage.setItem(DISMISS_KEY, DISMISSED_PERMANENTLY);
    }
  }, []);

  const canInstall = deferredPrompt !== null && !isInstalled && !isDismissed;

  return {
    canInstall,
    isInstalled,
    isDismissed,
    install,
    dismiss,
  };
}
