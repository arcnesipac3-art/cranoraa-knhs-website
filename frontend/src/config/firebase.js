import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Warn once at startup if critical Firebase env vars are missing
const _missingKeys = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (_missingKeys.length > 0) {
  console.warn(
    `[Firebase] Missing env vars: ${_missingKeys.join(', ')}. ` +
    'Push notifications will not work. Set VITE_FIREBASE_* in your .env.'
  );
}

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  console.error('[Firebase] initializeApp failed:', err.message);
}

/**
 * Returns the Firebase Messaging instance if the browser supports it.
 * Returns null on unsupported browsers (e.g. Safari private mode).
 */
export async function getMessagingInstance() {
  try {
    if (_missingKeys.length > 0) {
      console.warn('[Firebase] Skipping messaging — missing env vars');
      return null;
    }
    const supported = await isSupported();
    if (!supported) {
      console.warn('[Firebase] Messaging not supported in this browser');
      return null;
    }
    return getMessaging(app);
  } catch (err) {
    console.error('[Firebase] getMessagingInstance error:', err.message || err);
    return null;
  }
}

export { app };
