import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';

export interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  scrollable?: boolean;
  padded?: boolean;
  safeArea?: boolean;
}

export function ScreenContainer({
  children,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  onRefresh,
  refreshing = false,
  scrollable = true,
  padded = true,
  safeArea = true,
  style,
  ...props
}: ScreenContainerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error?.message || 'An unexpected error occurred'}
        onAction={onRetry}
      />
    );
  }

  const content = (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.background.secondary,
          paddingTop: safeArea ? insets.top : 0,
          paddingBottom: safeArea ? insets.bottom : 0,
          paddingHorizontal: padded ? theme.spacing.lg : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {content}
      </ScrollView>
    );
  }

  return content;
}