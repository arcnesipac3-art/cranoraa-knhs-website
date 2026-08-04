// ── Firebase Cloud Messaging Service Worker ─────────────────────────────────
// Standalone service worker that handles FCM background push notifications.
// Registered independently from the Workbox PWA service worker so the two
// don't interfere with each other.
//
// The __VITE_*__ placeholders below are replaced at build time by the
// firebaseSwPlugin in vite.config.js, and also on-the-fly in dev mode via
// the configureServer middleware.  The file in public/ always keeps the
// placeholder strings — never commit real values here.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Guard: skip initialization if env vars weren't injected ─────────────────
const _projectId = '__VITE_FIREBASE_PROJECT_ID__';
const _senderId  = '__VITE_FIREBASE_MESSAGING_SENDER_ID__';

if (!_projectId || _projectId.startsWith('__VITE_')) {
  console.warn('[firebase-messaging-sw] Firebase config not injected — push notifications disabled.');
} else {
  firebase.initializeApp({
    apiKey:            '__VITE_FIREBASE_API_KEY__',
    authDomain:        '__VITE_FIREBASE_AUTH_DOMAIN__',
    projectId:         _projectId,
    storageBucket:     '__VITE_FIREBASE_STORAGE_BUCKET__',
    messagingSenderId: _senderId,
    appId:             '__VITE_FIREBASE_APP_ID__',
  });

  const messaging = firebase.messaging();

  // ── Background Message Handler ────────────────────────────────────────────
  // Called when a push notification arrives while the app is backgrounded,
  // minimised, or the tab is closed.
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
}

// ── Notification Click Handler ───────────────────────────────────────────────
// Runs regardless of whether Firebase initialised — we always want clicks
// on any notification shown by this SW to open/focus the app.
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
          // Bring the window to the front
          return client.focus();
        }
      }

      // No existing window — open a new one at the link
      return self.clients.openWindow(link);
    })()
  );
});
