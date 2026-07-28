import { useQuery, useMutation, useQueryClient } from 'react-query';
import { notificationService } from '@api/services/notification.service';
import { Notification, NotificationPreference } from '@api/types';

export function useNotifications(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationService.getNotifications(params),
    staleTime: 30 * 1000,
  });
}

export function useNotification(id: number) {
  return useQuery({
    queryKey: ['notifications', id],
    queryFn: () => notificationService.getNotification(id),
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unreadCount']);
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unreadCount']);
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unreadCount']);
    },
  });
}

export function useNotificationPolling(lastCheck: string) {
  return useQuery({
    queryKey: ['notificationsPolling', lastCheck],
    queryFn: () => notificationService.getPolling(lastCheck),
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: () => notificationService.getPreferences(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<NotificationPreference>) => notificationService.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationPreferences']);
    },
  });
}

export function useRegisterFcmToken() {
  return useMutation({
    mutationFn: (token: string) => notificationService.registerFcmToken(token),
  });
}

export function useDeleteFcmToken() {
  return useMutation({
    mutationFn: (token: string) => notificationService.deleteFcmToken(token),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}