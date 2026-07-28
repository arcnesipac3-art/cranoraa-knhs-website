import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: keyof typeof MaterialIcons.glyph_map;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'inbox',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
        minHeight: 200,
      }}
    >
      <MaterialIcons
        name={icon}
        size={64}
        color={theme.colors.text.tertiary}
      />
      <Text
        style={{
          marginTop: theme.spacing.lg,
          fontSize: theme.fontSize.xl,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.text.primary,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {message && (
        <Text
          style={{
            marginTop: theme.spacing.sm,
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
            textAlign: 'center',
          }}
        >
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          style={{ marginTop: theme.spacing.lg }}
        />
      )}
    </View>
  );
}