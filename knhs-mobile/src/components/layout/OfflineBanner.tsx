import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { useUIStore } from '@stores/ui.store';

export function OfflineBanner() {
  const theme = useTheme();
  const isOnline = useUIStore((state) => state.isOnline);

  if (isOnline) return null;

  return (
    <View
      style={{
        backgroundColor: theme.colors.warning.DEFAULT,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Some features may be limited."
    >
      <MaterialIcons name="cloud-off" size={16} color="#FFFFFF" />
      <Text
        style={{
          marginLeft: theme.spacing.sm,
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: '#FFFFFF',
        }}
      >
        You're offline. Some features may be limited.
      </Text>
    </View>
  );
}