import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@theme';

export default function PortalLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background.primary,
        },
        animation: 'slide_from_right',
      }}
    />
  );
}