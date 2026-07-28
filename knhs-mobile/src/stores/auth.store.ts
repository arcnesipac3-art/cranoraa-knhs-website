import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient, setAccessToken, getAccessToken } from '@api/client';
import { authService } from '@api/services/auth.service';
import { User, LoginRequest } from '@api/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const userJson = await SecureStore.getItemAsync('user');

      if (!refreshToken || !userJson) {
        set({ isInitialized: true });
        return;
      }

      const user = JSON.parse(userJson) as User;

      set({
        user,
        isAuthenticated: true,
        isInitialized: true,
      });

      try {
        const { access } = await authService.refreshToken(refreshToken);
        setAccessToken(access);
      } catch {
        setAccessToken(null);
      }
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },

  login: async (data: LoginRequest) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.login(data);
      setAccessToken(response.access);
      await SecureStore.setItemAsync('refreshToken', response.refresh);
      await SecureStore.setItemAsync('user', JSON.stringify(response.user));

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Login failed';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      if (getAccessToken()) {
        await authService.logout();
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      setAccessToken(null);
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setUser: (user) => set({ user }),

  updateUser: (partialUser) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...partialUser };
      set({ user: updatedUser });
      SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
    }
  },

  clearError: () => set({ error: null }),
}));