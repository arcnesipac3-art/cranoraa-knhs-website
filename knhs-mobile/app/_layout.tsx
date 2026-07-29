import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@providers/QueryProvider';
import { ThemeProvider } from '@providers/ThemeProvider';
import { OfflineProvider } from '@providers/OfflineProvider';
import { useAuthStore } from '@stores/auth.store';
import { useOnboardingStore } from '@stores/onboarding.store';
import { useTokenRefresh } from '@hooks/useTokenRefresh';
import { notificationService } from '@services/notification.service';
import { useThemeContext } from '@providers/ThemeProvider';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

function TokenRefreshHandler() {
  useTokenRefresh();
  return null;
}

function AuthNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    SplashScreen.hideAsync().catch(() => {});

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(main)/dashboard');
    }
  }, [isInitialized, isAuthenticated, segments]);

  return null;
}

function RootLayoutInner() {
  const { initialize: initializeAuth } = useAuthStore();
  const { initialize: initializeOnboarding } = useOnboardingStore();
  const { isDark } = useThemeContext();

  useEffect(() => {
    notificationService.setNotificationHandler();
    initializeAuth();
    initializeOnboarding();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <TokenRefreshHandler />
      <AuthNavigator />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <ThemeProvider>
          <OfflineProvider>
            <RootLayoutInner />
          </OfflineProvider>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
