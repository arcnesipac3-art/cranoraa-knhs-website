import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@theme';

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius,
}: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: borderRadius || theme.borderRadius.md,
        backgroundColor: theme.colors.neutral[200],
        opacity,
      }}
    />
  );
}

export function SkeletonCard() {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.card.bg,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.sm,
      }}
    >
      <Skeleton height={24} width="60%" />
      <View style={{ marginTop: theme.spacing.md }}>
        <Skeleton height={16} width="100%" />
        <Skeleton height={16} width="80%" marginTop={theme.spacing.sm} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}