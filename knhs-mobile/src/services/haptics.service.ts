import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const hapticsService = {
  impactAsync: async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(style);
    }
  },

  notificationAsync: async (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(type);
    }
  },

  selectionAsync: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Haptics.selectionAsync();
    }
  },

  successAsync: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  warningAsync: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },

  errorAsync: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  lightImpactAsync: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  mediumImpactAsync: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  heavyImpactAsync: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },
};