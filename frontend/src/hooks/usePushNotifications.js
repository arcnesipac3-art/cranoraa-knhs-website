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
      const { title, body, icon } = payload.notification || {};

      // Show a browser notification even in foreground
      if (Notification.permission === 'granted') {
        new Notification(title || 'KNHS Portal', {
          body: body || '',
          icon: icon || '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: payload.data,
          tag: payload.data?.tag || undefined,
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
      // Get the Workbox service worker registration (registered by vite-plugin-pwa)
      const swRegistration = await navigator.serviceWorker.ready;

      const currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
        serviceWorkerRegistration: swRegistration,
      });

      if (currentToken) {
        setToken(currentToken);

        // Register with backend
        try {
          await api.post('/fcm-tokens/', {
            token: currentToken,
            device_type: 'web',
          });
        } catch (err) {
          console.warn('Failed to register FCM token with backend:', err);
        }

        return currentToken;
      }
    } catch (err) {
      console.warn('Failed to get FCM token:', err);
    }

    return null;
  }, []);

  // Delete token from Firebase and backend on logout
  const deleteToken = useCallback(async () => {
    const messaging = messagingRef.current;
    if (!messaging || !token) return;

    try {
      const { deleteToken: fbDelete } = await import('firebase/messaging');
      await fbDelete(messaging);
    } catch {
      // Token may already be deleted
    }

    // Deactivate on backend
    try {
      await api.delete('/fcm-tokens/delete/', { data: { token } });
    } catch {
      // Best effort
    }

    setToken(null);
  }, [token]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied';

    const result = await Notification.requestPermission();
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
