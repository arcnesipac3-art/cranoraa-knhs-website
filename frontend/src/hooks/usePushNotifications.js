import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessagingInstance } from '../config/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import api from '../utils/api';

/**
 * Hook for managing Firebase Cloud Messaging push notifications.
 *
 * Handles:
 *   - Permission request
 *   - FCM token acquisition and backend registration
 *   - Foreground message listening
 *   - Token cleanup on logout
 *
 * Usage:
 *   const { permission, token, requestPermission, isSupported } = usePushNotifications();
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [token, setToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const messagingRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Check Firebase Messaging support on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      const messaging = await getMessagingInstance();
      if (!mounted) return;

      if (messaging) {
        messagingRef.current = messaging;
        setIsSupported(true);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Listen for foreground messages when messaging is available
  useEffect(() => {
    const messaging = messagingRef.current;
    if (!messaging) return;

    unsubscribeRef.current = onMessage(messaging, (payload) => {
      // When the app is in focus, the WebSocket already delivers the notification
      // via the NotificationContext (toast + state update). Only show a browser
      // Notification if the tab is not visible (user switched tabs) so we don't
      // double-notify.
      if (document.visibilityState === 'visible') return;

      const title = payload.notification?.title || payload.data?.title || 'KNHS Portal';
      const body = payload.notification?.body || payload.data?.body || '';
      const icon = payload.notification?.icon || payload.data?.icon || '/icons/school-logo-source.png';

      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon,
          badge: '/icons/school-logo-source.png',
          data: payload.data,
          tag: payload.data?.notification_id || payload.data?.link || 'notification',
        });
      }
    });

    return () => {
      unsubscribeRef.current?.();
    };
  }, [isSupported]);

  // Acquire FCM token and register with backend
  const registerToken = useCallback(async () => {
    const messaging = messagingRef.current;
    if (!messaging) return null;

    try {
      // Force-delete any cached token from a previous Firebase project
      try {
        const { deleteToken: fbDelete } = await import('firebase/messaging');
        await fbDelete(messaging);
      } catch {
        // No existing token or already deleted
      }

      // Aggressively clear ALL Firebase data: service workers, push subscriptions, IndexedDB
      try {
        // Unregister the Firebase messaging service worker
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if (reg.scope?.includes('firebase') || reg.active?.scriptURL?.includes('firebase')) {
            // Clear push subscription before unregistering
            try {
              const sub = await reg.pushManager?.getSubscription();
              if (sub) await sub.unsubscribe();
            } catch {}
            await reg.unregister();
          }
        }
      } catch {
        // Best effort
      }

      // Also clear Firebase installations data from IndexedDB
      // This forces a completely fresh token from the correct project
      try {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db.name?.includes('firebase') || db.name?.includes('firebase-installations')) {
            indexedDB.deleteDatabase(db.name);
          }
        }
      } catch {
        // Best effort
      }

      // Wipe all stale tokens on the backend for this user
      try {
        await api.post('/fcm-tokens/deactivate-all/');
      } catch {
        // Best effort
      }
      // Register firebase-messaging-sw.js at a dedicated scope so it does NOT
      // conflict with the Workbox PWA service worker (sw.js) which owns '/'.
      // Firebase requires a SW at scope '/firebase-cloud-messaging-push-scope'
      // when you pass a custom serviceWorkerRegistration.
      let swRegistration;
      try {
        // Re-use an existing registration if already active to avoid installing twice
        const existing = await navigator.serviceWorker.getRegistration(
          '/firebase-cloud-messaging-push-scope'
        );
        swRegistration = existing || await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: '/firebase-cloud-messaging-push-scope' }
        );
        // Wait for the SW to be active before requesting a token
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.error('FCM: failed to register firebase-messaging-sw.js:', swErr);
        return null;
      }

      const currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
        serviceWorkerRegistration: swRegistration,
      });

      if (currentToken) {
        setToken(currentToken);

        // Register with backend
        try {
          const res = await api.post('/fcm-tokens/', {
            token: currentToken,
            device_type: 'web',
          });
          console.log('FCM token registered with backend:', res.data);
        } catch (err) {
          console.error('Failed to register FCM token with backend:', err.response?.data || err.message);
        }

        return currentToken;
      } else {
        console.warn('FCM: getToken returned null — notification permission may have changed');
      }
    } catch (err) {
      console.error('FCM token error:', err.code || err.message || err);
    }

    return null;
  }, []);

  // Delete token from Firebase and backend on logout
  const deleteToken = useCallback(async () => {
    const messaging = messagingRef.current;
    const currentToken = token;
    if (!messaging || !currentToken) return;

    try {
      const { deleteToken: fbDelete } = await import('firebase/messaging');
      await fbDelete(messaging);
    } catch {
      // Token may already be deleted
    }

    // Deactivate on backend — axios sends the body with DELETE requests
    try {
      await api.delete('/fcm-tokens/delete/', { data: { token: currentToken } });
    } catch {
      // Best effort
    }

    setToken(null);
  }, [token]);

  // Request notification permission.
  // IMPORTANT: On mobile Chrome, Notification.requestPermission() must be
  // called directly from a user gesture. Wrapping it in extra async/await
  // layers can break the gesture context, causing the prompt to silently fail.
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied';

    let result;
    try {
      result = await Notification.requestPermission();
    } catch (err) {
      console.error('FCM: requestPermission failed:', err);
      result = 'denied';
    }

    setPermission(result);

    if (result === 'granted') {
      await registerToken();
    }

    return result;
  }, [registerToken]);

  return {
    permission,
    token,
    isSupported,
    requestPermission,
    registerToken,
    deleteToken,
  };
}
