import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@theme';

export interface RoleGateProps {
  allowedRoles: string[];
  userRole: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({
  allowedRoles,
  userRole,
  children,
  fallback,
}: RoleGateProps) {
  const theme = useTheme();

  if (!allowedRoles.includes(userRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
}

export interface GradeBadgeProps {
  grade: number;
  showLabel?: boolean;
}

export function GradeBadge({ grade, showLabel = true }: GradeBadgeProps) {
  const theme = useTheme();

  const getGradeColor = () => {
    if (grade >= 90) return theme.colors.success.DEFAULT;
    if (grade >= 85) return theme.colors.primary[500];
    if (grade >= 80) return theme.colors.warning.DEFAULT;
    if (grade >= 75) return theme.colors.warning.dark;
    return theme.colors.error.DEFAULT;
  };

  const getGradeLabel = () => {
    if (grade >= 90) return 'Outstanding';
    if (grade >= 85) return 'Very Satisfactory';
    if (grade >= 80) return 'Satisfactory';
    if (grade >= 75) return 'Fairly Satisfactory';
    return 'Did Not Meet';
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          backgroundColor: getGradeColor(),
          borderRadius: theme.borderRadius.full,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 2,
        }}
      >
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.semibold,
            color: '#FFFFFF',
          }}
        >
          {grade.toFixed(1)}
        </Text>
      </View>
      {showLabel && (
        <Text
          style={{
            marginLeft: theme.spacing.sm,
            fontSize: theme.fontSize.sm,
            color: theme.colors.text.secondary,
          }}
        >
          {getGradeLabel()}
        </Text>
      )}
    </View>
  );
}

export interface AttendanceIndicatorProps {
  status: 'present' | 'absent' | 'late' | 'excused';
  showLabel?: boolean;
}

export function AttendanceIndicator({ status, showLabel = true }: AttendanceIndicatorProps) {
  const theme = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'present':
        return theme.colors.success.DEFAULT;
      case 'absent':
        return theme.colors.error.DEFAULT;
      case 'late':
        return theme.colors.warning.DEFAULT;
      case 'excused':
        return theme.colors.primary[500];
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'absent':
        return 'Absent';
      case 'late':
        return 'Late';
      case 'excused':
        return 'Excused';
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: getStatusColor(),
        }}
      />
      {showLabel && (
        <Text
          style={{
            marginLeft: theme.spacing.xs,
            fontSize: theme.fontSize.sm,
            color: getStatusColor(),
            fontWeight: theme.fontWeight.medium,
          }}
        >
          {getStatusLabel()}
        </Text>
      )}
    </View>
  );
}