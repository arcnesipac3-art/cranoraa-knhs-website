import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@theme';

export interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({
  uri,
  name,
  size = 'md',
}: AvatarProps) {
  const theme = useTheme();

  const getSize = () => {
    const sizes = {
      sm: 32,
      md: 40,
      lg: 56,
      xl: 80,
    };
    return sizes[size];
  };

  const getFontSize = () => {
    const sizes = {
      sm: theme.fontSize.xs,
      md: theme.fontSize.sm,
      lg: theme.fontSize.lg,
      xl: theme.fontSize.xl,
    };
    return sizes[size];
  };

  const getInitials = () => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getBackgroundColor = () => {
    if (!name) return theme.colors.neutral[300];
    const colors = [
      theme.colors.primary[500],
      theme.colors.success.DEFAULT,
      theme.colors.warning.DEFAULT,
      theme.colors.error.DEFAULT,
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const sizeValue = getSize();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: sizeValue,
          height: sizeValue,
          borderRadius: sizeValue / 2,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: sizeValue,
        height: sizeValue,
        borderRadius: sizeValue / 2,
        backgroundColor: getBackgroundColor(),
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: getFontSize(),
          fontWeight: theme.fontWeight.semibold,
          color: '#FFFFFF',
        }}
      >
        {getInitials()}
      </Text>
    </View>
  );
}