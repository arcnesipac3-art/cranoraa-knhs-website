import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, Notification, NotificationPreference } from '@api/types';

export const notificationService = {
  getNotifications: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get(API_ENDPOINTS.notifications.list, { params });
    return response.data;
  },

  getNotification: async (id: number): Promise<Notification> => {
    const response = await apiClient.get(`${API_ENDPOINTS.notifications.list}${id}/`);
    return response.data;
  },

  markAsRead: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.notifications.list}${id}read/`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.notifications.list}read-all/`);
    return response.data;
  },

  deleteNotification: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.notifications.list}${id}/`);
  },

  getPolling: async (lastCheck: string): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get(API_ENDPOINTS.notifications.polling, { params: { last_check: lastCheck } });
    return response.data;
  },

  getPreferences: async (): Promise<NotificationPreference> => {
    const response = await apiClient.get(API_ENDPOINTS.notifications.preferences);
    return response.data;
  },

  updatePreferences: async (data: Partial<NotificationPreference>): Promise<NotificationPreference> => {
    const response = await apiClient.patch(API_ENDPOINTS.notifications.preferences, data);
    return response.data;
  },

  registerFcmToken: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.notifications.fcmTokens, { token });
    return response.data;
  },

  deleteFcmToken: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.notifications.fcmTokens}delete/`, { token });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get(`${API_ENDPOINTS.notifications.list}unread-count/`);
    return response.data;
  },
};