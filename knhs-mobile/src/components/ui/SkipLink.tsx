import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@theme';

interface SkipLinkProps {
  label: string;
  target: string;
  onPress: () => void;
}

export function SkipLink({ label, target, onPress }: SkipLinkProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      accessibilityLabel={`${label} ${target}`}
      accessibilityRole="link"
      onPress={onPress}
      style={{
        position: 'absolute',
        top: -100,
        left: 0,
        backgroundColor: theme.colors.primary[600],
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        zIndex: 9999,
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: theme.fontSize.base,
          fontWeight: theme.fontWeight.semibold,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}