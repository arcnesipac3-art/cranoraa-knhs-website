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

const app = initializeApp(firebaseConfig);

/**
 * Returns the Firebase Messaging instance if the browser supports it.
 * Returns null on unsupported browsers (e.g. Safari private mode).
 */
export async function getMessagingInstance() {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
}

export { app };
