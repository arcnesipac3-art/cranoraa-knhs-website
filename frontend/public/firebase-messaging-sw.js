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
    tag: data.notification_id || data.link || 'notification',
    requireInteraction: false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── Notification Click Handler ──────────────────────────────────────────────
// Focuses the existing app window and navigates to the notification link.
// If no window is open, opens a new one at the link path.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const link = event.notification.data?.link || '/notifications';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Find an existing window on this origin
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          // Tell the React app to navigate to the link
          client.postMessage({ type: 'NOTIFICATION_CLICK', link });
          // Focus the window (brings it to front if minimized/tabbed away)
          return client.focus();
        }
      }

      // No existing window — open a new one at the link
      return self.clients.openWindow(link);
    })()
  );
});
