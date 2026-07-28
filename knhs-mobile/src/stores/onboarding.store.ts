import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  hasSeenTour: boolean;
  hasSeenTooltips: Record<string, boolean>;
  isLoading: boolean;

  initialize: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  markTourSeen: () => Promise<void>;
  markTooltipSeen: (tooltipId: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  hasCompletedOnboarding: false,
  hasSeenTour: false,
  hasSeenTooltips: {},
  isLoading: false,

  initialize: async () => {
    try {
      set({ isLoading: true });
      const completed = await SecureStore.getItemAsync('onboarding_completed');
      const tourSeen = await SecureStore.getItemAsync('tour_seen');
      const tooltipsJson = await SecureStore.getItemAsync('tooltips_seen');

      set({
        hasCompletedOnboarding: completed === 'true',
        hasSeenTour: tourSeen === 'true',
        hasSeenTooltips: tooltipsJson ? JSON.parse(tooltipsJson) : {},
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  completeOnboarding: async () => {
    await SecureStore.setItemAsync('onboarding_completed', 'true');
    set({ hasCompletedOnboarding: true });
  },

  markTourSeen: async () => {
    await SecureStore.setItemAsync('tour_seen', 'true');
    set({ hasSeenTour: true });
  },

  markTooltipSeen: async (tooltipId: string) => {
    const currentTooltips = get().hasSeenTooltips;
    const updatedTooltips = { ...currentTooltips, [tooltipId]: true };
    await SecureStore.setItemAsync('tooltips_seen', JSON.stringify(updatedTooltips));
    set({ hasSeenTooltips: updatedTooltips });
  },

  resetOnboarding: async () => {
    await SecureStore.deleteItemAsync('onboarding_completed');
    await SecureStore.deleteItemAsync('tour_seen');
    await SecureStore.deleteItemAsync('tooltips_seen');
    set({
      hasCompletedOnboarding: false,
      hasSeenTour: false,
      hasSeenTooltips: {},
    });
  },
}));