import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '@theme';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  padding = 'md',
  style,
  children,
  ...props
}: CardProps) {
  const theme = useTheme();

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    };

    const paddingStyles: Record<string, ViewStyle> = {
      none: {},
      sm: { padding: theme.spacing.sm },
      md: { padding: theme.spacing.lg },
      lg: { padding: theme.spacing.xl },
    };

    const variantStyles: Record<string, ViewStyle> = {
      default: {
        backgroundColor: theme.colors.card.bg,
        ...theme.shadows.sm,
      },
      elevated: {
        backgroundColor: theme.colors.card.bg,
        ...theme.shadows.md,
      },
      outlined: {
        backgroundColor: theme.colors.card.bg,
        borderWidth: 1,
        borderColor: theme.colors.card.border,
      },
    };

    return {
      ...baseStyle,
      ...paddingStyles[padding],
      ...variantStyles[variant],
    };
  };

  return (
    <View style={[getContainerStyle(), style]} {...props}>
      {children}
    </View>
  );
}