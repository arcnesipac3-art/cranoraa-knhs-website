import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@stores/auth.store';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isInitialized, user } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPortalGroup = segments[0] === '(portal)';
    const inMainGroup = segments[0] === '(main)';

    if (!isAuthenticated && !inAuthGroup && !inPortalGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Check if force password change is required
      if ((user as any)?.must_change_password) {
        router.replace('/(auth)/force-password-change');
      } else {
        router.replace('/(main)/dashboard');
      }
    } else if (isAuthenticated && !inAuthGroup && (user as any)?.must_change_password) {
      // User is authenticated but needs password change - redirect from any non-auth screen
      router.replace('/(auth)/force-password-change');
    }
  }, [isAuthenticated, isInitialized, segments, user, router]);

  if (!isInitialized) {
    return null;
  }

  return <>{children}</>;
}
