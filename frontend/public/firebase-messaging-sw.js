// ── Firebase Cloud Messaging Service Worker ─────────────────────────────────
// Handles background push notifications and notification click actions.
// This is separate from the Workbox PWA service worker.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            '__VITE_FIREBASE_API_KEY__',
  authDomain:        '__VITE_FIREBASE_AUTH_DOMAIN__',
  projectId:         '__VITE_FIREBASE_PROJECT_ID__',
  storageBucket:     '__VITE_FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__VITE_FIREBASE_MESSAGING_SENDER_ID__',
  appId:             '__VITE_FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

// ── Background Message Handler ──────────────────────────────────────────────
// Called when a push notification arrives while the app is in the background.
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, link } = payload.notification || {};
  const data = payload.data || {};

  const notificationTitle = title || 'KNHS Portal';
  const notificationOptions = {
    body: body || '',
    icon: icon || '/icons/school-logo-source.png',
    badge: '/icons/school-logo-source.png',
    data: { link: link || data.link || '/notifications' },
    tag: data.tag || undefined,
    requireInteraction: false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── Notification Click Handler ──────────────────────────────────────────────
// Opens or focuses the app window when the user clicks a notification.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const link = event.notification.data?.link || '/notifications';

  event.waitUntil(
    (async () => {
      // Focus existing window if one is open to this origin
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate to the link, then focus
          client.postMessage({ type: 'NOTIFICATION_CLICK', link });
          return client.focus();
        }
      }

      // No existing window — open a new one
      return self.clients.openWindow(link);
    })()
  );
});
