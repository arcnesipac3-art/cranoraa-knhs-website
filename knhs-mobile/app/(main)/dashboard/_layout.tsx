import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@theme';

export default function DashboardLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background.secondary,
        },
        animation: 'fade',
      }}
    />
  );
}
