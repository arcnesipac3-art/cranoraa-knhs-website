import { create } from 'zustand';
import { User, UserProfile } from '@api/types';
import { userService } from '@api/services/user.service';

interface UserState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;

  fetchCurrentUser: (userId: number) => Promise<void>;
  updateProfile: (userId: number, data: Partial<UserProfile>) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  isLoading: false,
  error: null,

  fetchCurrentUser: async (userId: number) => {
    try {
      set({ isLoading: true, error: null });
      const user = await userService.getById(userId);
      set({ currentUser: user, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Failed to fetch user';
      set({ isLoading: false, error: message });
    }
  },

  updateProfile: async (userId: number, data: Partial<UserProfile>) => {
    try {
      set({ isLoading: true, error: null });
      const updatedProfile = await userService.updateProfile(userId, data);
      const currentUser = get().currentUser;
      if (currentUser) {
        set({
          currentUser: { ...currentUser, profile: updatedProfile },
          isLoading: false,
        });
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Failed to update profile';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  setCurrentUser: (user) => set({ currentUser: user }),

  clearError: () => set({ error: null }),
}));