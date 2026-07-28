import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: keyof typeof MaterialIcons.glyph_map;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({
  title,
  value,
  icon,
  iconColor,
  trend,
}: StatCardProps) {
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing.xs,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize['2xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text.primary,
            }}
          >
            {value}
          </Text>
          {trend && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: theme.spacing.xs,
              }}
            >
              <MaterialIcons
                name={trend.isPositive ? 'trending-up' : 'trending-down'}
                size={16}
                color={trend.isPositive ? theme.colors.success.DEFAULT : theme.colors.error.DEFAULT}
              />
              <Text
                style={{
                  fontSize: theme.fontSize.xs,
                  color: trend.isPositive ? theme.colors.success.DEFAULT : theme.colors.error.DEFAULT,
                  marginLeft: 4,
                }}
              >
                {Math.abs(trend.value)}%
              </Text>
            </View>
          )}
        </View>
        {icon && (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: theme.borderRadius.lg,
              backgroundColor: iconColor ? `${iconColor}15` : theme.colors.primary[100],
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons
              name={icon}
              size={24}
              color={iconColor || theme.colors.primary[600]}
            />
          </View>
        )}
      </View>
    </View>
  );
}