import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@providers/QueryProvider';
import { ThemeProvider } from '@providers/ThemeProvider';
import { AuthGate } from '@providers/AuthGate';
import { OfflineProvider } from '@providers/OfflineProvider';
import { useAuthStore } from '@stores/auth.store';
import { useOnboardingStore } from '@stores/onboarding.store';
import { useTokenRefresh } from '@hooks/useTokenRefresh';
import { notificationService } from '@services/notification.service';
import { useThemeContext } from '@providers/ThemeProvider';

function TokenRefreshHandler() {
  useTokenRefresh();
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
            <AuthGate>
              <RootLayoutInner />
            </AuthGate>
          </OfflineProvider>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}