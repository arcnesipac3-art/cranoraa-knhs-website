import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  label,
  variant = 'primary',
  size = 'md',
}: BadgeProps) {
  const theme = useTheme();

  const getContainerStyle = () => {
    const sizeStyles = {
      sm: { paddingVertical: 2, paddingHorizontal: 6 },
      md: { paddingVertical: 4, paddingHorizontal: 8 },
      lg: { paddingVertical: 6, paddingHorizontal: 12 },
    };

    const variantStyles = {
      primary: { backgroundColor: theme.colors.primary[100] },
      secondary: { backgroundColor: theme.colors.neutral[100] },
      success: { backgroundColor: theme.colors.success.light },
      warning: { backgroundColor: theme.colors.warning.light },
      error: { backgroundColor: theme.colors.error.light },
      info: { backgroundColor: theme.colors.primary[100] },
    };

    return {
      borderRadius: theme.borderRadius.full,
      alignSelf: 'flex-start',
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyle = () => {
    const sizeStyles = {
      sm: { fontSize: theme.fontSize.xs },
      md: { fontSize: theme.fontSize.sm },
      lg: { fontSize: theme.fontSize.base },
    };

    const variantStyles = {
      primary: { color: theme.colors.primary[700] },
      secondary: { color: theme.colors.neutral[700] },
      success: { color: theme.colors.success.dark },
      warning: { color: theme.colors.warning.dark },
      error: { color: theme.colors.error.dark },
      info: { color: theme.colors.primary[700] },
    };

    return {
      fontWeight: theme.fontWeight.medium,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <View style={getContainerStyle()}>
      <Text style={getTextStyle()}>{label}</Text>
    </View>
  );
}