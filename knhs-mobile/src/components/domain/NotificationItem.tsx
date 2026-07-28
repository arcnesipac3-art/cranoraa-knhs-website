import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Notification } from '@api/types';
import { timeAgo } from '@utils/format';

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const theme = useTheme();

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'grade':
        return 'school';
      case 'attendance':
        return 'event-available';
      case 'announcement':
        return 'campaign';
      case 'message':
        return 'chat';
      case 'fee':
        return 'payments';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = () => {
    switch (notification.type) {
      case 'grade':
        return theme.colors.primary[600];
      case 'attendance':
        return theme.colors.success.DEFAULT;
      case 'announcement':
        return theme.colors.warning.DEFAULT;
      case 'message':
        return theme.colors.info;
      case 'fee':
        return theme.colors.error.DEFAULT;
      case 'system':
        return theme.colors.neutral[500];
      default:
        return theme.colors.primary[600];
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: theme.spacing.md,
        backgroundColor: notification.is_read
          ? 'transparent'
          : `${theme.colors.primary[50]}08`,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${getNotificationColor()}15`,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <MaterialIcons
          name={getNotificationIcon() as any}
          size={20}
          color={getNotificationColor()}
        />
      </View>

      <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: notification.is_read
              ? theme.fontWeight.regular
              : theme.fontWeight.semibold,
            color: theme.colors.text.primary,
          }}
          numberOfLines={1}
        >
          {notification.title}
        </Text>
        <Text
          style={{
            marginTop: 2,
            fontSize: theme.fontSize.sm,
            color: theme.colors.text.secondary,
          }}
          numberOfLines={2}
        >
          {notification.message}
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: theme.fontSize.xs,
            color: theme.colors.text.tertiary,
          }}
        >
          {timeAgo(notification.created_at)}
        </Text>
      </View>

      {!notification.is_read && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.primary[600],
            marginLeft: theme.spacing.sm,
            marginTop: theme.spacing.xs,
          }}
        />
      )}
    </TouchableOpacity>
  );
}