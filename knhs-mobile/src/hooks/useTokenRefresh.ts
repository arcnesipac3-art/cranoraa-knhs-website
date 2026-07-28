import React, { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@stores/auth.store';
import { getAccessToken, setAccessToken } from '@api/client';
import { authService } from '@api/services/auth.service';
import * as SecureStore from 'expo-secure-store';

const REFRESH_INTERVAL = 14 * 60 * 1000;

export function useTokenRefresh() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isAuthenticated, logout } = useAuthStore();

  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = await SecureStore.getItemAsync('refreshToken');
      if (!refreshTokenValue) {
        await logout();
        return;
      }

      const response = await authService.refreshToken(refreshTokenValue);
      setAccessToken(response.access);
      await SecureStore.setItemAsync('refreshToken', response.refresh);
    } catch (error) {
      await logout();
    }
  }, [logout]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshToken();
      intervalRef.current = setInterval(refreshToken, REFRESH_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, refreshToken]);

  return { refreshToken };
}