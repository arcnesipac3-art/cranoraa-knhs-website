import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from 'flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { ScreenContainer } from '@components/layout/ScreenContainer';
import { Header } from '@components/layout/Header';
import { EmptyState } from '@components/ui/EmptyState';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@hooks/queries/useNotifications';
import { Notification } from '@api/types';
import { NotificationItem } from '@components/domain/NotificationItem';

export default function NotificationsScreen() {
  const theme = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const notifications = data?.results || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllAsRead.mutate();
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
    />
  );

  return (
    <ScreenContainer isLoading={isLoading} isError={isError} onRetry={refetch} scrollable={false}>
      <Header
        title="Notifications"
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.primary[600],
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                Mark all read
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {unreadCount > 0 && (
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
          }}
        >
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.secondary,
            }}
          >
            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlashList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        estimatedItemSize={80}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-none"
            title="No notifications"
            message="You're all caught up!"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              backgroundColor: theme.colors.border.DEFAULT,
              marginLeft: 56,
            }}
          />
        )}
      />
    </ScreenContainer>
  );
}