import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@theme';

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'large',
  color,
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const theme = useTheme();

  const spinnerColor = color || theme.colors.primary[600];

  if (fullScreen) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background.primary,
        }}
      >
        <ActivityIndicator size={size} color={spinnerColor} />
        {text && (
          <Text
            style={{
              marginTop: theme.spacing.md,
              fontSize: theme.fontSize.base,
              color: theme.colors.text.secondary,
            }}
          >
            {text}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
      }}
    >
      <ActivityIndicator size={size} color={spinnerColor} />
      {text && (
        <Text
          style={{
            marginTop: theme.spacing.md,
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
          }}
        >
          {text}
        </Text>
      )}
    </View>
  );
}