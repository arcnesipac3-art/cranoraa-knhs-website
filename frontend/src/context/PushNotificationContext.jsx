import { createContext, useContext, useEffect, useRef } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { getStoredUser, getAccessToken } from '../utils/auth';

const PushNotificationContext = createContext(null);

export const usePushNotificationContext = () => useContext(PushNotificationContext);

/**
 * Provider that manages the FCM push notification token lifecycle.
 *
 * Automatically:
 *   - Registers the FCM token with the backend when a user logs in
 *   -   (only if permission is already granted)
 *   - Deletes the token from the backend when the user logs out
 *   - Re-registers when permission changes to 'granted' (e.g. user
 *     re-enables notifications after previously denying)
 *
 * Does NOT request permission automatically — that must be triggered
 * explicitly (e.g. from the Notifications page preferences panel).
 */
export function PushNotificationProvider({ children }) {
  const {
    permission,
    token,
    isSupported,
    requestPermission,
    registerToken,
    deleteToken,
  } = usePushNotifications();

  const prevUserIdRef = useRef(null);
  const prevPermissionRef = useRef(permission);
  const user = getStoredUser();
  const userId = user?.id;

  // Register token on login (if permission already granted)
  useEffect(() => {
    if (!userId || !isSupported || !getAccessToken()) return;

    // Only act on actual login (userId changed from null to a value)
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;

    if (permission === 'granted') {
      registerToken();
    }
  }, [userId, isSupported, permission, registerToken]);

  // Re-register token on page load if permission is already granted
  useEffect(() => {
    if (!userId || !isSupported || permission !== 'granted' || !getAccessToken()) return;
    registerToken();
  }, [isSupported, permission, registerToken, userId]);

  // Re-register when permission changes to 'granted' (user re-enabled)
  useEffect(() => {
    if (!userId || !isSupported || !getAccessToken()) return;
    if (prevPermissionRef.current !== 'granted' && permission === 'granted') {
      registerToken();
    }
    prevPermissionRef.current = permission;
  }, [permission, isSupported, userId, registerToken]);

  // Delete token on logout
  useEffect(() => {
    if (prevUserIdRef.current && !userId) {
      // User just logged out
      deleteToken();
      prevUserIdRef.current = null;
    }
  }, [userId, deleteToken]);

  const value = {
    permission,
    token,
    isSupported,
    requestPermission,
    registerToken,
    deleteToken,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}
